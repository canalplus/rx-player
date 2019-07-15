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
import {
  combineLatest,
  EMPTY,
  Observable,
  of as observableOf,
  Subject,
  Subscription,
} from "rxjs";
import {
  catchError,
  distinctUntilChanged,
  map,
  mapTo,
  mergeMap,
  shareReplay,
  take,
} from "rxjs/operators";
import { QueuedSourceBuffer } from "../../../core/source_buffers";
import { Representation } from "../../../manifest";
import arrayFindIndex from "../../../utils/array_find_index";
import castToObservable from "../../../utils/cast_to_observable";
import concatMapLatest from "../../../utils/concat_map_latest";
import PPromise from "../../../utils/promise";
import {
  areRangesOverlapping,
  convertToRanges,
} from "../../../utils/ranges";
import request from "../../../utils/request";
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
 * Load needed segment data.
 * @param {Object} thumbnails
 * @param {HTMLMediaElement} mediaElement
 */
function getSegmentData(
  thumbnails: IThumbnailInfo[],
  mediaElement: HTMLMediaElement
): Observable<ArrayBuffer[]> {

  const thumbnailsToLoad = thumbnails.filter((t) => {
    const tRange = { start: t.start, end: t.start + t.duration };
    const mediaRanges = convertToRanges(mediaElement.buffered);
    return arrayFindIndex(mediaRanges, (mr) => {
      return tRange.start >= mr.start && tRange.end <= mr.end;
    }) === -1;
  });

  if (!thumbnailsToLoad.length) {
    return EMPTY;
  }

  const loadedData$ = thumbnailsToLoad.map(({ mediaURL }) => {
    return request({
      url: mediaURL,
      sendProgressEvents: false,
      responseType: "arraybuffer",
    });
  });

  return combineLatest(loadedData$).pipe(
    map((loadedData) => {
      const responseDatas = loadedData.map(({ value }) => value.responseData);
      return responseDatas;
    }),
    take(1)
  );
}

/**
 * This tool, as a supplement to the RxPlayer, intent to help creating thumbnails
 * from a video source.
 *
 * From a given video adaptation, the tools will extract a "thumbnail track",
 * either from a trickMode track (whose light chunks are adapted from such use case)
 * or direclty from the media content.
 */
export default class VideoThumbnailLoader {
  private readonly _thumbnailVideoElement: HTMLVideoElement;
  private readonly _bufferedDataRanges: Array<{
    start: number;
    end: number;
  }>;

  private _thumbnailTrack: IThumbnailTrack;

  private _currentCallback: Observable<unknown> | null;
  private _nextCallback: null | Observable<unknown>;

  private _setTime$: Subject<number>;
  private _setTimeSubscription$: Subscription;

  constructor(
    videoElement: HTMLVideoElement,
    trickModeTrack: Representation
  ) {
    // readonly
    this._thumbnailVideoElement = videoElement;
    this._bufferedDataRanges = [];

    // nullable
    this._thumbnailTrack = this.updateThumbnailTrack(trickModeTrack);
    this._currentCallback = null;
    this._nextCallback = null;
    this._setTime$ = new Subject();

    const videoSourceInfos$ = prepareSourceBuffer(
      this._thumbnailVideoElement,
      this._thumbnailTrack.codec
    ).pipe(
      mergeMap(({ videoSourceBuffer }) => {
        const { initURL: init, codec } = this._thumbnailTrack;
        return request({ url: init,
                         sendProgressEvents: false,
                         responseType: "arraybuffer",
        }).pipe(
          mergeMap((e) => {
            const { value: { responseData }} = e;
            return videoSourceBuffer.appendBuffer({
              initSegment : responseData,
              segment: null,
              codec,
              timestampOffset: 0,
            });
          }),
          mapTo(videoSourceBuffer)
        );
      }),
      catchError(() => {
        throw new Error("VideoThumbnailLoaderError: Couldn't open media source.");
      }),
      shareReplay()
    );

    this._setTimeSubscription$ = this._setTime$.pipe(
      distinctUntilChanged(),
      concatMapLatest((time) => {
        if (time !== this._thumbnailVideoElement.currentTime) {
          const setTimeCallback: () => Observable<null> = () => {
            return videoSourceInfos$.pipe(
              mergeMap((videoSourceBuffer) => {
                return castToObservable(this.removeBuffers(videoSourceBuffer, time)).pipe(
                  mergeMap(() => {
                    if (!this._thumbnailTrack) {
                      throw new Error(
                        "VideoThumbnailLoaderError: No thumbnail track given.");
                    }

                    const thumbnails: IThumbnailInfo[] | undefined =
                      this._thumbnailTrack.thumbnailInfos
                        .filter((t) => {
                          const thumbnailDuration = t.duration;
                          const range = { start: time - thumbnailDuration,
                                          end: time + thumbnailDuration };
                          const tRange = { start: t.start, end: t.start + t.duration };
                          return areRangesOverlapping(range, tRange);
                        });

                    if (thumbnails.length === 0) {
                      throw new Error(
                        "VideoThumbnailLoaderError: Couldn't find thumbnail.");
                    }

                    return getSegmentData(thumbnails, videoElement).pipe(
                      mergeMap((datas) => {
                        if (datas) {
                          const appendBuffers$ = combineLatest(
                            datas.map((data) => {
                              return videoSourceBuffer
                                .appendBuffer({
                                  segment: data,
                                  initSegment: null,
                                  codec: this._thumbnailTrack.codec,
                                  timestampOffset: 0,
                                });
                            })
                          );
                          return appendBuffers$.pipe(
                              mergeMap(() => {
                                thumbnails.forEach((t) => {
                                  this._bufferedDataRanges.push({
                                    start: t.start,
                                    end: t.start + t.duration,
                                  });
                                });
                                this._thumbnailVideoElement.currentTime = time;
                                return observableOf(null);
                              }),
                              catchError((err) => {
                                throw new Error(
                                  "VideoThumbnailLoaderError: Couldn't append buffer :" +
                                  err.message || err
                                );
                              })
                            );
                        }
                        return observableOf(null);
                      })
                    );
                  }));
              })
            );
          };
          this._nextCallback = setTimeCallback();
          return this.flush().pipe(
            catchError((err) => {
              this.dispose();
              throw err;
            })
          );
        }
        return observableOf(null);
      })
    ).subscribe();
  }

  /**
   * Set time of thumbnail video media element :
   * - Remove buffer when too much buffered data
   * - Search for thumbnail track element to display
   * - Load data
   * - Append data
   * Resolves when time is set.
   * @param {number} time, this._thumbnailVideoElement.currentTime
   * @returns {Promise}
   */
  setTime(time: number) {
    this._setTime$.next(time);
  }

  /**
   * Update thumbnail track from adaptation
   * @param {Object} adaptation
   * @returns {Object}
   */
  public updateThumbnailTrack(trickModeTrack: Representation): IThumbnailTrack {
    const trackIndex = trickModeTrack.index;
    const indexStart = trackIndex.getFirstPosition();
    const indexEnd = trackIndex.getLastPosition();

    if (indexStart != null && indexEnd != null) {
      const segments = trackIndex.getSegments(indexStart, indexEnd - indexStart);

      const thumbnailInfos = segments
        .filter((s) => s.duration != null && s.mediaURL != null)
        .map((s) => {
          return {
            duration: (s.duration || 0) / s.timescale,
            start: s.time / s.timescale,
            mediaURL: s.mediaURL || "",
          };
        });
      const initSegment =
        trickModeTrack.index.getInitSegment();
      return {
        thumbnailInfos,
        codec: trickModeTrack.getMimeTypeString(),
        initURL: initSegment ? (initSegment.mediaURL || "") : "",
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
  dispose(_retry?: number): void {
    this._setTimeSubscription$.unsubscribe();
    return;
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
    }> = [];
    while (this._bufferedDataRanges.length > MAXIMUM_MEDIA_BUFFERED) {
      const newBuffer = this._bufferedDataRanges.shift();
      if (newBuffer) {
        bufferToRemove.push(newBuffer);
      }
    }

    const removeBufferActions$: Array<Promise<void>> = [];
    bufferToRemove.forEach(({ start, end }) => {
      const prm = videoSourceBuffer.removeBuffer(start, end)
        .toPromise(PPromise).then(() => {
          const bufferIdx =
            arrayFindIndex(this._bufferedDataRanges, ({ start: s, end: e }) => {
              return s <= time && e > time;
            });
          if (bufferIdx > -1) {
            this._bufferedDataRanges.splice(bufferIdx, 1);
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
  private flush(): Observable<unknown> {
    if (!this._currentCallback && this._nextCallback) {
      this._currentCallback = this._nextCallback;
      this._nextCallback = null;
      return this._currentCallback
        .pipe(
          mergeMap(() => {
            this._currentCallback = null;
            return this.flush();
          }),
          take(1)
        );
    }
    return observableOf(null);
  }
}
