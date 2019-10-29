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
  combineLatest as observableCombineLatest,
  EMPTY,
  Observable,
  of as observableOf,
  Subject,
  Subscription,
} from "rxjs";
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  mergeMap,
  shareReplay,
  switchMap,
  tap,
} from "rxjs/operators";
import { Representation } from "../../../manifest";
import LightVideoQueuedSourceBuffer from "./light_video_queued_source_buffer";
import log from "./log";
import prepareSourceBuffer from "./media_source";
import {
  getInitSegment,
  getSegmentsData
} from "./segment_utils";
import {
  getThumbnailTrack,
  getWantedThumbnails,
  IThumbnail,
  IThumbnailTrack,
} from "./thumbnail_track_utils";

/**
 * This tool, as a supplement to the RxPlayer, intent to help creating thumbnails
 * from a video source.
 *
 * From a given video adaptation, the tools will extract a "thumbnail track",
 * either from a video track (whose light chunks are adapted from such use case)
 * or direclty from the media content.
 */
export default class VideoThumbnailLoader {
  private readonly _thumbnailVideoElement: HTMLVideoElement;

  private _thumbnailTrack: IThumbnailTrack;
  private _error: Error | null;

  private _startPipeline$: Subject<{
    time: number;
    thumbnailTrack: IThumbnailTrack;
    resolve: () => void;
    reject: (err: Error) => void;
  }>;
  private _subscription$: Subscription;

  constructor(
    videoElement: HTMLVideoElement,
    initVideoTrack: Representation
  ) {
    this._thumbnailVideoElement = videoElement;
    this._thumbnailTrack = getThumbnailTrack(initVideoTrack);
    this._error = null;

    this._startPipeline$ = new Subject();

    const videoSourceInfos$ = prepareSourceBuffer(
      this._thumbnailVideoElement,
      this._thumbnailTrack.codec
    ).pipe(
      mergeMap((videoSourceBuffer) => {
        return getInitSegment(this._thumbnailTrack).pipe(
          mergeMap(({ value: { responseData } }) => {
            return videoSourceBuffer.appendSegment({
              initSegment: responseData,
              chunk: null,
              codec: this._thumbnailTrack.codec,
            });
          }),
          mapTo(videoSourceBuffer));
      }),
      catchError(() => {
        throw new Error("VideoThumbnailLoaderError: Couldn't open media source.");
      }),
      shareReplay()
    );

    this._subscription$ = this._startPipeline$.pipe(
      filter(({ time }, i) => time !== this._thumbnailVideoElement.currentTime ||
                              i === 0),
      mergeMap((payload) => {
        const thumbnails = getWantedThumbnails(payload.thumbnailTrack,
                                               payload.time,
                                               videoElement.buffered);
        if (thumbnails === null) {
          payload.reject(new Error("VideoThumbnailLoaderError: " +
                                   "Couldn't find thumbnail."));
          return EMPTY;
        }
        if (thumbnails.length === 0) {
          log.debug("VTL: Thumbnail already loaded.");
          payload.resolve();
          return EMPTY;
        }
        log.debug("VTL: Found thumbnails for time", payload.time, thumbnails);
        return observableOf({ thumbnails, payload });
      }),
      distinctUntilChanged((a, b) => {
        if (a.payload.thumbnailTrack.codec !== b.payload.thumbnailTrack.codec ||
            a.thumbnails.length !== b.thumbnails.length) {
          return false;
        }
        for (let i = 0; i < a.thumbnails.length; i++) {
          if (a.thumbnails[i].start !== b.thumbnails[i].start ||
              a.thumbnails[i].duration !== b.thumbnails[i].duration ||
              a.thumbnails[i].mediaURL !== b.thumbnails[i].mediaURL) {
            return false;
          }
        }
        return true;
      }),
      switchMap(({ thumbnails, payload: { time, thumbnailTrack, resolve, reject } }) => {
        return videoSourceInfos$.pipe(
          mergeMap((videoSourceBuffer) => {
            return this.loadInitThumbnail(thumbnailTrack, videoSourceBuffer).pipe(
              mergeMap(() => {
                const removeBuffers$ = observableCombineLatest([
                  videoSourceBuffer.removeBuffer(0, time - 5),
                  videoSourceBuffer.removeBuffer(time + 5, Infinity)]);
                return removeBuffers$.pipe(
                  mergeMap(() => {
                    log.debug("VTL: Removed buffer before appending segments.", time);
                    return this.loadThumbnails(thumbnails, videoSourceBuffer, time)
                      .pipe(tap(resolve));
                  })
                );
              })
            );
          }),
          catchError((err) => {
            this.dispose();
            reject(err);
            return EMPTY;
          })
        );
      })
    ).subscribe(
      () => ({}),
      (err) => {
        this.dispose();
        this._error = err;
      }
    );
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
  setTime(time: number, videoTrack: Representation): Promise<unknown> {
    const thumbnailTrack = getThumbnailTrack(videoTrack);
    return new Promise((resolve, reject) => {
      this._startPipeline$.next({ time, thumbnailTrack, resolve, reject });
    });
  }

  /**
   * Get thrown error
   * @returns {Error|null}
   */
  getError(): Error | null {
    return this._error;
  }

  /**
   * Dispose thumbnail loader.
   * @returns {void}
   */
  dispose(): void {
    this._subscription$.unsubscribe();
    return;
  }

  /**
   * Fetch and append init segment of thumbnail track.
   * @param {Array.<Object>} thumbnails
   * @param {Object} videoSourceBuffer
   * @param {number} time
   */
  private loadThumbnails(thumbnails: IThumbnail[],
                         videoSourceBuffer: LightVideoQueuedSourceBuffer,
                         time: number): Observable<unknown> {
    return getSegmentsData(thumbnails, this._thumbnailVideoElement).pipe(
      mergeMap((data) => {
        const appendBuffer$ = videoSourceBuffer
          .appendSegment({
            chunk: data,
            initSegment: null,
            codec: this._thumbnailTrack.codec,
          });
        return appendBuffer$.pipe(
          tap(() => {
            log.debug("VTL: Appended segment.", data, time);
            this._thumbnailVideoElement.currentTime = time;
          })
        );
      })
    );
  }

  /**
   * Fetch and append media segment associated thumbnail.
   * @param {Array.<Object>} thumbnails
   * @param {Object} videoSourceBuffer
   * @param {number} time
   * @returns {Observable}
   */
  private loadInitThumbnail(
    thumbnailTrack: IThumbnailTrack,
    videoSourceBuffer: LightVideoQueuedSourceBuffer
  ): Observable<unknown> {
    if (thumbnailTrack.codec === this._thumbnailTrack.codec &&
        thumbnailTrack.initURL === this._thumbnailTrack.initURL) {
      return observableOf(null);
    }

    return getInitSegment(thumbnailTrack).pipe(
      mergeMap(({ value: { responseData } }) => {
        return videoSourceBuffer.appendSegment({
          initSegment: responseData,
          chunk: null,
          codec: thumbnailTrack.codec,
        });
      }),
      map(() => {
        this._thumbnailTrack = thumbnailTrack;
        return null;
      })
    );
  }
}
