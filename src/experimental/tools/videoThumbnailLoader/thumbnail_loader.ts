/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { QueuedSourceBuffer } from "../../../core/source_buffers";
import Adaptation from "../../../manifest/adaptation";
import arrayFind from "../../../utils/array_find";
import arrayFindIndex from "../../../utils/array_find_index";
import PPromise from "../../../utils/promise";
import appendInitSegment from "./append_init_segment";
import loadArrayBufferData from "./load_array_buffer_data";
import prepareSourceBuffer from "./media_source";

interface IThumbnailInfo {
  start: number;
  duration: number;
  mediaURL: string;
}

interface IThumbnailTrack {
  thumbnailInfos: IThumbnailInfo[];
  initURL: string;
  codec: string;
}

const MAXIMUM_MEDIA_BUFFERED = 2;

/**
 * This tool, as a supplement to the RxPlayer, intent to help creating thumbnails
 * from a video source.
 *
 * From a given video adaptation, the tools will extract a "thumbnail track",
 * either from a trickmode track (whose light chunks are adapted from such use case)
 * or direclty from the media content.
 */
export default class VideoThumbnailLoader {
  private readonly _thumbnailVideoElement : HTMLVideoElement;
  private readonly _onlyTrickMode : boolean;
  private readonly _videoSourceInfos: Promise<{
    videoSourceBuffer: QueuedSourceBuffer<ArrayBuffer>;
    disposeMediaSource: () => void;
  }>;
  private readonly _bufferedDataCache: Array<{
    start: number;
    end: number;
    data: ArrayBuffer;
  }>;

  private  _initSegment: ArrayBuffer|null;
  private _thumbnailTrack : IThumbnailTrack;
  private _currentCallback: Promise<unknown>|null;
  private _nextCallback: null|(() => Promise<unknown>);

  constructor(
    videoElement: HTMLVideoElement,
    adaptation: Adaptation,
    onlyTrickmode: boolean = true
  ) {
    // readonly
    this._thumbnailVideoElement = videoElement;
    this._onlyTrickMode = onlyTrickmode;
    this._bufferedDataCache = [];

    // nullable
    this._initSegment = null;
    this._thumbnailTrack = this.updateThumbnailTrack(adaptation);
    this._currentCallback = null;
    this._nextCallback = null;

    this._videoSourceInfos = prepareSourceBuffer(
      this._thumbnailVideoElement,
      this._thumbnailTrack.codec
    ).then(({ videoSourceBuffer, disposeMediaSource }) => {
      const { initURL: init, codec } = this._thumbnailTrack;
      return appendInitSegment(init, codec, videoSourceBuffer).then((initSegment) => {
        this._initSegment = initSegment;
        return {
          videoSourceBuffer,
          disposeMediaSource,
        };
      });
    }).catch(() => {
      throw new Error("VideoThumbnailLoaderError: Couldn't open media source.");
    });
  }

  /**
   * Set time of thumbnail video media element :
   * - Remove buffer when too much buffered data
   * - Search for thumbnail track element to display
   * - Load data
   * - Append data
   * Resolves when time is set.
   * @param {number} time
   * @returns {Promise}
   */
  setTime(time: number): Promise<number> {
    return new Promise((resolveOnSetTime, rejectOnSetTime) => {
      const setTimeCallback: () => Promise<unknown> = () => {
        return this._videoSourceInfos.then(({ videoSourceBuffer }) => {
          if (time !== this._thumbnailVideoElement.currentTime) {
            return this.removeBuffers(videoSourceBuffer, time).then(() => {
              if (!this._thumbnailTrack) {
                return rejectOnSetTime(
                  "VideoThumbnailLoaderError: No thumbnail track given.");
              }

              const thumbnail: IThumbnailInfo|undefined =
                arrayFind(this._thumbnailTrack.thumbnailInfos, (t) => {
                  return t.start <= time && (t.duration + t.start) > time;
                });

              if (!thumbnail) {
                return rejectOnSetTime(
                  "VideoThumbnailLoaderError: Couldn't find thumbnail.");
              }

              return this.getSegmentData(time, thumbnail.mediaURL).then(({
                data,
                fromNetwork,
              }) => {
                return videoSourceBuffer
                  .appendBuffer({
                    segment: data,
                    initSegment: this._initSegment,
                    codec: "null",
                    timestampOffset: 0,
                  }).toPromise(PPromise).then(() => {
                    if (fromNetwork) {
                      this._bufferedDataCache.push({
                        start: thumbnail.start,
                        end: thumbnail.start + thumbnail.duration,
                        data,
                      });
                    }
                    this._thumbnailVideoElement.currentTime = time;
                    resolveOnSetTime(this._thumbnailVideoElement.currentTime);
                    return;
                  }).catch((err) => {
                    throw new Error(
                      "VideoThumbnailLoaderError: Couldn't append buffer :" +
                      err.message || err
                    );
                  });
              });
            });
          }
          return resolveOnSetTime(this._thumbnailVideoElement.currentTime);
        });
      };
      this._nextCallback = setTimeCallback;
      /* tslint:disable no-floating-promises */
      try {
        this.flush();
      } catch (e) {
        return this.dispose().then(() => {
          throw e;
        });
      }
      /* tslint:enable no-floating-promises */
    });
  }

  /**
   * Update thumbnail track from adaptation
   * @param {Object} adaptation
   * @returns {Object}
   */
  public updateThumbnailTrack(adaptation: Adaptation): IThumbnailTrack {
    if (this._onlyTrickMode && !adaptation.trickModeTrack) {
      throw new Error("VideoThumbnailLoaderError: No provided trick mode track.");
    }

    const trickModeTrack = adaptation.trickModeTrack || adaptation;
    if (trickModeTrack.representations.length === 0) {
      throw new Error(
        "VideoThumbnailLoaderError: No representations in trick mode track.");
    }

    const trackIndex = trickModeTrack.representations[0].index;
    const indexStart = trackIndex.getFirstPosition();
    const indexEnd = trackIndex.getLastPosition();

    if (indexStart != null && indexEnd != null) {
      const segments = trackIndex.getSegments(indexStart, indexEnd - indexStart);

      const thumbnailInfos = segments
        .filter((s) => s.duration != null && s.mediaURL != null)
        .map((s) => {
          return {
            duration: (s.duration || 0) / s.timescale,
            start: s.time / s.timescale,
            mediaURL: s.mediaURL || "",
          };
        });
      const initSegment =
        trickModeTrack.representations[0].index.getInitSegment();
      return {
        thumbnailInfos,
        codec: trickModeTrack.representations[0].getMimeTypeString(),
        initURL: initSegment ? (initSegment.mediaURL || "") : "",
      };
    } else {
      throw new Error(
        "VideoThumbnailLoaderError: Can't get segments from trick mode track.");
    }
  }

  /**
   * Dispose media source.
   * @param {Function|undefined} _resolve
   * @returns {Promise}
   */
  dispose(_retry?: number): Promise<unknown> {
    let retry = _retry || 0;
    const maxRetry = 5;
    const delayInMs = 100;

    return this._videoSourceInfos.then(({ disposeMediaSource }) => {
      return (this._currentCallback || PPromise.resolve()).then(() => {
        if (this._nextCallback != null) {
          if (retry > maxRetry) {
            throw new Error("VideoThumbnailLoaderError: Error while disposing.");
          }
          return new Promise<unknown>((resolve) => {
            setTimeout(() => resolve(this.dispose(retry++)), delayInMs * retry);
          });
        }
        return disposeMediaSource();
      });
    });
  }

  /**
   * Get segment data from cache or load it.
   * @param {number} time
   * @param {string} mediaURL
   */
  private getSegmentData(
    time: number,
    mediaURL: string
  ): Promise<{ data: ArrayBuffer; fromNetwork: boolean }> {
    const bufferIdx = arrayFindIndex(this._bufferedDataCache, ({ start, end }) => {
      return start <= time && end > time;
    });

    const fromNetwork = bufferIdx === -1;
    const loadedData = fromNetwork ?
      loadArrayBufferData(mediaURL) :
      PPromise.resolve(this._bufferedDataCache[bufferIdx].data);

    return loadedData.then((data) => {
      return {
        data,
        fromNetwork,
      };
    });
  }

  /**
   * @param {Object} videoSourceBuffer
   * @returns {Promise}
   */
  private removeBuffers<T>(
    videoSourceBuffer: QueuedSourceBuffer<T>,
    time: number
  ): Promise<unknown> {
    const bufferToRemove: Array<{
      start: number;
      end: number;
      data: ArrayBuffer;
    }> = [];
    while (this._bufferedDataCache.length > MAXIMUM_MEDIA_BUFFERED) {
      const newBuffer = this._bufferedDataCache.shift();
      if (newBuffer) {
        bufferToRemove.push(newBuffer);
      }
    }

    const removeBufferActions$: Array<Promise<void>> = [];
    bufferToRemove.forEach(({ start, end }) => {
      const prm = videoSourceBuffer.removeBuffer(start, end)
        .toPromise(PPromise).then(() => {
          const bufferIdx =
            arrayFindIndex(this._bufferedDataCache, ({ start: s, end: e }) => {
              return s <= time && e > time;
            });
          if (bufferIdx > -1) {
            this._bufferedDataCache.splice(bufferIdx, 1);
          }
        });
      removeBufferActions$.push(prm);
    });
    return PPromise.all(removeBufferActions$);
  }

  /**
   * Flush buffer promises.
   * Resolves when no buffered operations.
   */
  private flush(): Promise<unknown> {
    if (this._currentCallback) {
      return this._currentCallback.then(() => {
        this._currentCallback = null;
        return this.flush();
      });
    } else {
      const setTime = this._nextCallback;
      if (setTime) {
        this._nextCallback = null;
        this._currentCallback = setTime();
        return this._currentCallback
          .then(() => this.flush());
      }
      return PPromise.resolve();
    }
  }
}
