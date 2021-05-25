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

import pinkie from "pinkie";
import {
  combineLatest,
  lastValueFrom,
  merge as observableMerge,
  race as observableRace,
  Subject,
} from "rxjs";
import {
  catchError,
  finalize,
  ignoreElements,
  map,
  mergeMap,
  take,
  tap,
} from "rxjs/operators";
import Player from "../../../core/api";
import createSegmentLoader from "../../../core/fetchers/segment/create_segment_loader";
import log from "../../../log";
import { ISegment } from "../../../manifest";
import objectAssign from "../../../utils/object_assign";
import { freeRequest } from "./create_request";
import getCompleteSegmentId from "./get_complete_segment_id";
import getContentInfos from "./get_content_infos";
import {
  disposeMediaSource,
  getInitializedSourceBuffer$,
} from "./get_initialized_source_buffer";
import loadSegments from "./load_segments";
import pushData from "./push_data";
import removeBufferAroundTime$ from "./remove_buffer_around_time";
import {
  IContentInfos,
  ILoaders,
} from "./types";
import VideoThumbnailLoaderError from "./video_thumbnail_loader_error";

const PPromise = typeof Promise === "function" ? Promise :
                                                 pinkie;

const MIN_NEEDED_DATA_AFTER_TIME = 2;

interface ITimeSettingTask { contentInfos: IContentInfos;
                             time: number;
                             stop: () => void;
                             promise: Promise<number>; }

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
  private _currentTask?: ITimeSettingTask;
  private _nextTaskSegmentsCompleteIds?: string[];
  private _loaders: ILoaders = {};
  constructor(videoElement: HTMLVideoElement,
              player: Player) {
    this._videoElement = videoElement;
    this._player = player;
  }

  /**
   * Add imported loader to thumbnail loader loader object.
   * It allows to use it when setting time.
   * @param {function} loaderFunc
   */
  addLoader(loaderFunc: (features: ILoaders) => void): void {
    loaderFunc(this._loaders);
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
    if (this._currentTask !== undefined) {
      if (time === this._currentTask.time) {
        // The current task is already handling the loading for the wanted time
        // (same thumbnail).
        return this._currentTask.promise;
      }
    }

    const manifest = this._player.getManifest();
    if (manifest === null) {
      return PPromise.reject(
        new VideoThumbnailLoaderError("NO_MANIFEST",
                                      "No manifest available."));
    }
    const contentInfos = getContentInfos(time, manifest);
    if (contentInfos === null) {
      return PPromise.reject(
        new VideoThumbnailLoaderError("NO_TRACK",
                                      "Couldn't find track for this time."));
    }

    const segments = contentInfos
      .representation.index.getSegments(time, MIN_NEEDED_DATA_AFTER_TIME);

    if (segments.length === 0) {
      return PPromise.reject(
        new VideoThumbnailLoaderError("NO_THUMBNAIL",
                                      "Couldn't find thumbnail for the given time."));
    }

    for (let j = 0; j < segments.length; j++) {
      const { time: stime, duration, timescale } = segments[j];
      const start = stime / timescale;
      const end = start + (duration / timescale);
      for (let i = 0; i < this._videoElement.buffered.length; i++) {
        if (this._videoElement.buffered.start(i) - + 0.001 <= start &&
            this._videoElement.buffered.end(i) + 0.001 >= end) {
          segments.splice(j, 1);
          j--;
          break;
        }
      }
    }

    if (segments.length === 0) {
      this._videoElement.currentTime = time;
      log.debug("VTL: Thumbnails already loaded.", time);
      return PPromise.resolve(time);
    }

    log.debug("VTL: Found thumbnail for time", time, segments);

    if (this._currentTask !== undefined) {
      this._nextTaskSegmentsCompleteIds =
        segments.map((segment) => getCompleteSegmentId(contentInfos, segment));
      this._currentTask.stop();
    }

    return this._startTimeSettingTask(contentInfos, segments, time);
  }

  /**
   * Dispose thumbnail loader.
   * @returns {void}
   */
  dispose(): void {
    if (this._currentTask !== undefined) {
      this._currentTask.stop();
    }
    this._loaders = {};
    disposeMediaSource();
  }

  /**
   * - Remove buffer when too much buffered data
   * - Load data
   * - Append data
   * - Set time on video element
   * @param {Object} contentInfos
   * @param {Object} contentInfos
   * @param {Object} contentInfos
   * @returns {Promise}
   */
  private _startTimeSettingTask(contentInfos: IContentInfos,
                                segments: ISegment[],
                                time: number
  ): Promise<number> {
    const loader = this._loaders[contentInfos.manifest.transport];
    if (loader === undefined) {
      const error =
        new VideoThumbnailLoaderError("NO_LOADER",
                                      "VideoThumbnailLoaderError: No " +
                                      "imported loader for this transport type: " +
                                      contentInfos.manifest.transport);
      return PPromise.reject(error);
    }
    const killTask$ = new Subject<void>();
    const abortError$ = killTask$.pipe(
      map(() => {
        throw new VideoThumbnailLoaderError("ABORTED",
                                            "VideoThumbnailLoaderError: Aborted job.");
      })
    );

    const segmentLoader = createSegmentLoader(
      loader.video.loader,
      undefined,
      { baseDelay: 0,
        maxDelay: 0,
        maxRetryOffline: 0,
        maxRetryRegular: 0 }
    );
    const { parser: segmentParser } = loader.video;

    const taskPromise: Promise<number> = lastValueFrom(observableRace(
      abortError$,
      getInitializedSourceBuffer$(contentInfos,
                                  this._videoElement,
                                  { segmentLoader,
                                    segmentParser }).pipe(
        mergeMap((videoSourceBuffer) => {
          const bufferCleaning$ = removeBufferAroundTime$(this._videoElement,
                                                          videoSourceBuffer,
                                                          time);
          log.debug("VTL: Removing buffer around time.", time);

          const segmentsLoading$ =
            loadSegments(segments, segmentLoader, contentInfos);

          return observableMerge(bufferCleaning$.pipe(ignoreElements()),
                                 segmentsLoading$
          ).pipe(
            mergeMap((arr) => {
              return combineLatest(
                arr.map(({ segment, data }) => {
                  const start = segment.time / segment.timescale;
                  const end = start + (segment.duration / segment.timescale);
                  const inventoryInfos = objectAssign({ segment,
                                                        start,
                                                        end }, contentInfos);
                  return pushData(inventoryInfos,
                                  segmentParser,
                                  data,
                                  videoSourceBuffer)
                    .pipe(tap(() => {
                      freeRequest(getCompleteSegmentId(inventoryInfos, segment));
                      log.debug("VTL: Appended segment.", data);
                    }));
                })
              );
            }),
            map(() => {
              this._videoElement.currentTime = time;
              return time;
            })
          );
        }),
        catchError((err: unknown) => {
          let message = "Unknown error.";
          if ((err as { message?: string; toString(): string }).message !== undefined ||
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            /* eslint-disable @typescript-eslint/no-unsafe-member-access */
            /* eslint-disable @typescript-eslint/no-unsafe-call */
              typeof (err as { message?: string;
                               toString(): string; }).toString === "function") {
            message = (err as any).message ?? (err as any).toString();
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */
            /* eslint-enable @typescript-eslint/no-unsafe-member-access */
            /* eslint-enable @typescript-eslint/no-unsafe-call */
          }
          throw new VideoThumbnailLoaderError("LOADING_ERROR", message);
        })
      )
    ).pipe(
      take(1),
      finalize(() => {
        segments.forEach((segment) => {
          const completeSegmentId = getCompleteSegmentId(contentInfos, segment);
          if (this._nextTaskSegmentsCompleteIds === undefined ||
              !this._nextTaskSegmentsCompleteIds.some((id) => completeSegmentId === id)) {
            freeRequest(completeSegmentId);
          }
        });
        this._nextTaskSegmentsCompleteIds = undefined;
        this._currentTask = undefined;
        killTask$.complete();
      })
    ));

    this._currentTask = { contentInfos,
                          time,
                          stop: () => killTask$.next(),
                          promise: taskPromise };

    return taskPromise;
  }
}

export { default as DASH_LOADER } from "./features/dash";
export { default as MPL_LOADER } from "./features/metaplaylist";
