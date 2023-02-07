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

import config from "../../../config";
import Player from "../../../core/api";
import createSegmentFetcher, {
  ISegmentFetcher,
} from "../../../core/fetchers/segment/segment_fetcher";
import { AudioVideoSegmentBuffer } from "../../../core/segment_buffers/implementations";
import log from "../../../log";
import Manifest, {
  ISegment,
} from "../../../manifest";
import arrayFind from "../../../utils/array_find";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import objectAssign from "../../../utils/object_assign";
import TaskCanceller, {
  CancellationError,
} from "../../../utils/task_canceller";
import loadAndPushSegment from "./load_and_push_segment";
import prepareSourceBuffer from "./prepare_source_buffer";
import removeBufferAroundTime from "./remove_buffer_around_time";
import {
  IContentInfo,
  ILoaders,
} from "./types";
import VideoThumbnailLoaderError from "./video_thumbnail_loader_error";

const MIN_NEEDED_DATA_AFTER_TIME = 2;

const loaders : ILoaders = {};

/**
 * This tool, as a supplement to the RxPlayer, intent to help creating thumbnails
 * from a video source.
 *
 * The tools will extract a "thumbnail track" either from a video track (whose light
 * chunks are adapted from such use case) or direclty from the media content.
 */
export default class VideoThumbnailLoader {
  private readonly _videoElement: HTMLVideoElement;
  private _player: Player;
  private _lastRepresentationInfo : IVideoThumbnailLoaderRepresentationInfo | null;

  constructor(videoElement: HTMLVideoElement, player: Player) {
    this._videoElement = videoElement;
    this._player = player;
    this._lastRepresentationInfo = null;
  }

  /**
   * Add imported loader to thumbnail loader loader object.
   * It allows to use it when setting time.
   * @param {function} loaderFunc
   */
  static addLoader(loaderFunc: (features: ILoaders) => void): void {
    loaderFunc(loaders);
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
    const manifest = this._player.getManifest();
    if (manifest === null) {
      if (this._lastRepresentationInfo !== null) {
        this._lastRepresentationInfo.cleaner.cancel();
        this._lastRepresentationInfo = null;
      }
      return Promise.reject(
        new VideoThumbnailLoaderError("NO_MANIFEST", "No manifest available.")
      );
    }
    const content = getTrickModeInfo(time, manifest);
    if (content === null) {
      if (this._lastRepresentationInfo !== null) {
        this._lastRepresentationInfo.cleaner.cancel();
        this._lastRepresentationInfo = null;
      }
      return Promise.reject(
        new VideoThumbnailLoaderError("NO_TRACK",
                                      "Couldn't find a trickmode track for this time.")
      );
    }

    if (this._lastRepresentationInfo !== null &&
        !areSameRepresentation(this._lastRepresentationInfo.content, content))
    {
      this._lastRepresentationInfo.cleaner.cancel();
      this._lastRepresentationInfo = null;
    }

    const neededSegments = content.representation.index
      .getSegments(time, MIN_NEEDED_DATA_AFTER_TIME);

    if (neededSegments.length === 0) {
      if (this._lastRepresentationInfo !== null) {
        this._lastRepresentationInfo.cleaner.cancel();
        this._lastRepresentationInfo = null;
      }
      return Promise.reject(
        new VideoThumbnailLoaderError("NO_THUMBNAIL",
                                      "Couldn't find any thumbnail for the given time.")
      );
    }

    // Check which of `neededSegments` are already buffered
    for (let j = 0; j < neededSegments.length; j++) {
      const { time: stime, duration, timescale } = neededSegments[j];
      const start = stime / timescale;
      const end = start + (duration / timescale);
      for (let i = 0; i < this._videoElement.buffered.length; i++) {
        if (this._videoElement.buffered.start(i) - 0.001 <= start &&
            this._videoElement.buffered.end(i) + 0.001 >= end)
        {
          neededSegments.splice(j, 1);
          j--;
          break;
        }
      }
    }

    if (neededSegments.length === 0) {
      this._videoElement.currentTime = time;
      log.debug("VTL: Thumbnails already loaded.", time);
      return Promise.resolve(time);
    }

    if (log.hasLevel("DEBUG")) {
      log.debug("VTL: Found thumbnail for time", time, neededSegments.map(s =>
        `start: ${s.time} - end: ${s.end}`
      ).join(", "));
    }

    const loader = loaders[content.manifest.transport];
    if (loader === undefined) {
      if (this._lastRepresentationInfo !== null) {
        this._lastRepresentationInfo.cleaner.cancel();
        this._lastRepresentationInfo = null;
      }
      return Promise.reject(new VideoThumbnailLoaderError(
        "NO_LOADER",
        "VideoThumbnailLoaderError: No imported loader for this transport type: " +
          content.manifest.transport));
    }

    let lastRepInfo : IVideoThumbnailLoaderRepresentationInfo;
    if (this._lastRepresentationInfo === null) {
      const cleaner = new TaskCanceller();
      const segmentFetcher = createSegmentFetcher(
        "video",
        loader.video,
        null,
        // We don't care about the SegmentFetcher's lifecycle events
        {},
        { baseDelay: 0,
          maxDelay: 0,
          maxRetryOffline: 0,
          maxRetryRegular: 0,
          requestTimeout: config.getCurrent().DEFAULT_REQUEST_TIMEOUT }
      ) as ISegmentFetcher<ArrayBuffer | Uint8Array>;
      const segmentBufferProm = prepareSourceBuffer(
        this._videoElement,
        content.representation.getMimeTypeString(),
        cleaner.signal
      ).then(async (segmentBuffer) => {
        const initSegment = content.representation.index.getInitSegment();
        if (initSegment === null) {
          return segmentBuffer;
        }
        const segmentInfo = objectAssign({ segment: initSegment },
                                         content);
        await loadAndPushSegment(segmentInfo,
                                 segmentBuffer,
                                 lastRepInfo.segmentFetcher,
                                 cleaner.signal);
        return segmentBuffer;
      });
      lastRepInfo = {
        cleaner,
        segmentBuffer: segmentBufferProm,
        content,
        segmentFetcher,
        pendingRequests: [],
      };
      this._lastRepresentationInfo = lastRepInfo;
    } else {
      lastRepInfo = this._lastRepresentationInfo;
    }

    abortUnlistedSegmentRequests(lastRepInfo.pendingRequests, neededSegments);

    const currentTaskCanceller = new TaskCanceller();

    return lastRepInfo.segmentBuffer
      .catch((err) => {
        if (this._lastRepresentationInfo !== null) {
          this._lastRepresentationInfo.cleaner.cancel();
          this._lastRepresentationInfo = null;
        }
        throw new VideoThumbnailLoaderError(
          "LOADING_ERROR",
          "VideoThumbnailLoaderError: Error when initializing buffers: " +
            String(err)
        );
      })
      .then(async (segmentBuffer) => {
        abortUnlistedSegmentRequests(lastRepInfo.pendingRequests, neededSegments);

        log.debug("VTL: Removing buffer around time.", time);
        await removeBufferAroundTime(this._videoElement,
                                     segmentBuffer,
                                     time,
                                     undefined,
                                     currentTaskCanceller.signal);


        abortUnlistedSegmentRequests(lastRepInfo.pendingRequests, neededSegments);
        const promises : Array<Promise<unknown>> = [];
        for (const segment of neededSegments) {
          const pending = arrayFind(lastRepInfo.pendingRequests,
                                    ({ segmentId }) => segmentId === segment.id);
          if (pending !== undefined) {
            promises.push(pending.promise);
          } else {
            const requestCanceller = new TaskCanceller();
            const unlinkSignal = requestCanceller
              .linkToSignal(lastRepInfo.cleaner.signal);
            const segmentInfo = objectAssign({ segment },
                                             content);
            const prom = loadAndPushSegment(segmentInfo,
                                            segmentBuffer,
                                            lastRepInfo.segmentFetcher,
                                            requestCanceller.signal)
              .finally(unlinkSignal);
            const newReq = {
              segmentId: segment.id,
              canceller: requestCanceller,
              promise: prom,
            };
            lastRepInfo.pendingRequests.push(newReq);

            const removePendingRequest = () => {
              const indexOf = lastRepInfo.pendingRequests.indexOf(newReq);
              if (indexOf >= 0) {
                lastRepInfo.pendingRequests.splice(indexOf, 1);
              }
            };
            prom.then(removePendingRequest, removePendingRequest);
            promises.push(prom);
          }
        }
        await Promise.all(promises);
        this._videoElement.currentTime = time;
        return time;
      })
      .catch((err) => {
        if (err instanceof CancellationError) {
          throw new VideoThumbnailLoaderError("ABORTED",
                                              "VideoThumbnailLoaderError: Aborted job.");
        }
        throw err;
      });
  }

  /**
   * Dispose thumbnail loader.
   * @returns {void}
   */
  dispose(): void {
    if (this._lastRepresentationInfo !== null) {
      this._lastRepresentationInfo.cleaner.cancel();
      this._lastRepresentationInfo = null;
    }
  }
}

/**
 * @param {Object} contentInfo1
 * @param {Object} contentInfo2
 * @returns {Boolean}
 */
function areSameRepresentation(
  contentInfo1: IContentInfo,
  contentInfo2: IContentInfo
): boolean {
  return (contentInfo1.representation.id === contentInfo2.representation.id &&
          contentInfo1.adaptation.id === contentInfo2.adaptation.id &&
          contentInfo1.period.id === contentInfo2.period.id &&
          contentInfo1.manifest.id === contentInfo2.manifest.id);
}

/**
 * From a given time, find the trickmode representation and return
 * the content information.
 * @param {number} time
 * @param {Object} manifest
 * @returns {Object|null}
 */
function getTrickModeInfo(
  time: number,
  manifest: Manifest
): IContentInfo | null {
  const period = manifest.getPeriodForTime(time);
  if (period === undefined ||
      period.adaptations.video === undefined ||
      period.adaptations.video.length === 0) {
    return null;
  }
  for (const videoAdaptation of period.adaptations.video) {
    const representation = videoAdaptation.trickModeTracks?.[0].representations?.[0];
    if (!isNullOrUndefined(representation)) {
      return { manifest,
               period,
               adaptation: videoAdaptation,
               representation };
    }
  }
  return null;
}

function abortUnlistedSegmentRequests(
  pendingRequests: IPendingRequestInfo[],
  neededSegments: ISegment[]
): void {
  pendingRequests
    .filter(req => !neededSegments.some(({ id }) => id === req.segmentId))
    .forEach(req => {
      req.canceller.cancel();
    });
}

/**
 * Object containing information stored by a `VideoThumbnailLoader` linked to
 * a single chosen Representation.
 */
interface IVideoThumbnailLoaderRepresentationInfo {
  /**
   * TaskCanceller allowing on cancellation to Stop everything, free resources
   * allocated for the current Manifest and remove MediaSource from the video
   * Element the VideoThumbnailLoader is associated with.
   */
  cleaner : TaskCanceller;
  /**
   * Promise encapsulating the task of creating the MediaSource, the video
   * AudioVideoSegmentBuffer, and pushing the initialization segment of the
   * current content on it.
   *
   * Resolves when done, rejects if any of those steps fail.
   */
  segmentBuffer : Promise<AudioVideoSegmentBuffer>;
  /**
   * Information on the content considered in this
   * `IVideoThumbnailLoaderRepresentationInfo`.
   */
  content : IContentInfo;
  /**
   * `ISegmentFetcher` used to fetch video media segments for the current
   * Representation.
   */
  segmentFetcher : ISegmentFetcher<ArrayBuffer | Uint8Array>;
  /**
   * List video media segment requests AND pushing (on the buffer) operations
   * that are currently pending.
   *
   * Once a segment is loaded and pushed with success, it is removed from
   * `pendingRequests`.
   */
  pendingRequests : IPendingRequestInfo[];
}

interface IPendingRequestInfo {
  /** `id` property of the `ISegment` concerned. */
  segmentId: string;
  /**
   * When this promise resolves, the segment is both loaded and pushed with
   * success.
   *
   * If it rejects, we could not either load or push the segment.
   */
  promise: Promise<unknown>;
  /**
   * Allows to stop loading and/or pushing the segment.
   */
  canceller: TaskCanceller;
}

export { default as DASH_LOADER } from "./features/dash";
export { default as MPL_LOADER } from "./features/metaplaylist";
