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
  BehaviorSubject,
  concat as observableConcat,
  defer as observableDefer,
  Observable,
  of as observableOf,
  merge as observableMerge,
  EMPTY,
  ReplaySubject,
} from "rxjs";
import {
  filter,
  finalize,
  map,
  mergeMap,
  share,
  switchMap,
  take,
} from "rxjs/operators";
import { ICustomError } from "../../../errors";
import log from "../../../log";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import {
  ISegmentParserParsedInitSegment,
  ISegmentParserParsedSegment,
} from "../../../transports";
import assert from "../../../utils/assert";
import assertUnreachable from "../../../utils/assert_unreachable";
import objectAssign from "../../../utils/object_assign";
import {
  IPrioritizedSegmentFetcher,
  IPrioritizedSegmentFetcherEvent,
} from "../../fetchers";
import {
  IQueuedSegment,
} from "../types";

/**
 * Class scheduling segment downloads for a single Representation.
 * @class DownloadingQueue
 */
export default class DownloadingQueue<T> {
  /** Context of the Representation that will be loaded through this DownloadingQueue. */
  private _content : IDownloadingQueueContext;
  /**
   * Observable doing segment requests and emitting related events.
   * We only can have maximum one at a time.
   * `null` when `start` has never been called.
   */
  private _currentObs$ : Observable<IDownloadingQueueEvent<T>> | null;
  /**
   * Current queue of segments scheduled for download.
   *
   * Segments whose request are still pending are still in that queue. Segments
   * are only removed from it once their request has succeeded.
   */
  private _downloadQueue$ : BehaviorSubject<IDownloadQueueItem>;
  /**
   * Pending request for the initialization segment.
   * `null` if no request is pending for it.
   */
  private _initSegmentRequest : ISegmentRequestObject<T>|null;
  /**
   * Pending request for a media (i.e. non-initialization) segment.
   * `null` if no request is pending for it.
   */
  private _mediaSegmentRequest : ISegmentRequestObject<T>|null;
  /** Interface used to load segments. */
  private _segmentFetcher : IPrioritizedSegmentFetcher<T>;
  /** Emit the timescale anounced in the initialization segment once parsed. */
  private _initSegmentMetadata$ : ReplaySubject<number | undefined>;
  /**
   * Some media segments might have been loaded and are only awaiting for the
   * initialization segment to be parsed before being parsed themselves.
   * This `Set` will contain the `id` property of all segments that are
   * currently awaiting this event.
   */
  private _mediaSegmentsAwaitingInitMetadata : Set<string>;

  /**
   * Create a new `DownloadingQueue`.
   *
   * @param {Object} content - The context of the Representation you want to
   * load segments for.
   * @param {BehaviorSubject} downloadQueue$ - Emit the queue of segments you
   * want to load.
   * @param {Object} segmentFetcher - Interface to facilitate the download of
   * segments.
   * @param {boolean} hasInitSegment - Declare that an initialization segment
   * will need to be downloaded.
   *
   * A `DownloadingQueue` ALWAYS wait for the initialization segment to be
   * loaded and parsed before parsing a media segment.
   *
   * In cases where no initialization segment exist, this would lead to the
   * `DownloadingQueue` waiting indefinitely for it.
   *
   * By setting that value to `false`, you anounce to the `DownloadingQueue`
   * that it should not wait for an initialization segment before parsing a
   * media segment.
   */
  constructor(
    content: IDownloadingQueueContext,
    downloadQueue$ : BehaviorSubject<IDownloadQueueItem>,
    segmentFetcher : IPrioritizedSegmentFetcher<T>,
    hasInitSegment : boolean
  ) {
    this._content = content;
    this._currentObs$ = null;
    this._downloadQueue$ = downloadQueue$;
    this._initSegmentRequest = null;
    this._mediaSegmentRequest = null;
    this._segmentFetcher = segmentFetcher;
    this._initSegmentMetadata$ = new ReplaySubject<number|undefined>(1);
    this._mediaSegmentsAwaitingInitMetadata = new Set();
    if (!hasInitSegment) {
      this._initSegmentMetadata$.next(undefined);
    }
  }

  /**
   * Returns the initialization segment currently being requested.
   * Returns `null` if no initialization segment request is pending.
   * @returns {Object}
   */
  public getRequestedInitSegment() : ISegment | null {
    return this._initSegmentRequest === null ? null :
                                               this._initSegmentRequest.segment;
  }

  /**
   * Returns the media segment currently being requested.
   * Returns `null` if no media segment request is pending.
   * @returns {Object}
   */
  public getRequestedMediaSegment() : ISegment | null {
    return this._mediaSegmentRequest === null ? null :
                                                this._mediaSegmentRequest.segment;
  }

  /**
   * Start the current downloading queue, emitting events as it loads and parses
   * initialization and media segments.
   *
   * If it was already started, returns the same - shared - Observable.
   * @returns {Observable}
   */
  public start() : Observable<IDownloadingQueueEvent<T>> {
    if (this._currentObs$ !== null) {
      return this._currentObs$;
    }
    const obs = observableDefer(() => {
      const mediaQueue$ = this._downloadQueue$.pipe(
        filter(({ segmentQueue }) => {
          // First, the first elements of the segmentQueue might be already
          // loaded but awaiting the initialization segment to be parsed.
          // Filter those out.
          let nextSegmentToLoadIdx = 0;
          for (; nextSegmentToLoadIdx < segmentQueue.length; nextSegmentToLoadIdx++) {
            const nextSegment = segmentQueue[nextSegmentToLoadIdx].segment;
            if (!this._mediaSegmentsAwaitingInitMetadata.has(nextSegment.id)) {
              break;
            }
          }

          const currentSegmentRequest = this._mediaSegmentRequest;
          if (nextSegmentToLoadIdx >= segmentQueue.length) {
            return currentSegmentRequest !== null;
          } else if (currentSegmentRequest === null) {
            return true;
          }
          const nextItem = segmentQueue[nextSegmentToLoadIdx];
          if (currentSegmentRequest.segment.id !== nextItem.segment.id) {
            return true;
          }
          if (currentSegmentRequest.priority !== nextItem.priority) {
            this._segmentFetcher.updatePriority(currentSegmentRequest.request$,
                                                nextItem.priority);
          }
          return false;
        }),
        switchMap(({ segmentQueue }) =>
          segmentQueue.length > 0 ? this._requestMediaSegments() :
                                    EMPTY));

      const initSegmentPush$ = this._downloadQueue$.pipe(
        filter((next) => {
          const initSegmentRequest = this._initSegmentRequest;
          if (next.initSegment !== null && initSegmentRequest !== null) {
            if (next.initSegment.priority !== initSegmentRequest.priority) {
              this._segmentFetcher.updatePriority(initSegmentRequest.request$,
                                                  next.initSegment.priority);
            }
            return false;
          } else {
            return next.initSegment === null || initSegmentRequest === null;
          }
        }),
        switchMap((nextQueue) => {
          if (nextQueue.initSegment === null) {
            return EMPTY;
          }
          return this._requestInitSegment(nextQueue.initSegment);
        }));

      return observableMerge(initSegmentPush$, mediaQueue$);
    }).pipe(share());

    this._currentObs$ = obs;

    return obs;
  }

  /**
   * Internal logic performing media segment requests.
   * @returns {Observable}
   */
  private _requestMediaSegments(
  ) : Observable<ILoaderRetryEvent |
                 IEndOfQueueEvent |
                 IParsedSegmentEvent<T> |
                 IEndOfSegmentEvent> {

    const { segmentQueue } = this._downloadQueue$.getValue();
    const currentNeededSegment = segmentQueue[0];
    const recursivelyRequestSegments = (
      startingSegment : IQueuedSegment | undefined
    ) : Observable<ILoaderRetryEvent |
                   IEndOfQueueEvent |
                   IParsedSegmentEvent<T> |
                   IEndOfSegmentEvent
    > => {
      if (startingSegment === undefined) {
        return observableOf({ type : "end-of-queue",
                              value : null });
      }
      const { segment, priority } = startingSegment;
      const context = objectAssign({ segment }, this._content);
      const request$ = this._segmentFetcher.createRequest(context, priority);

      this._mediaSegmentRequest = { segment, priority, request$ };
      return request$
        .pipe(mergeMap((evt) => {
          switch (evt.type) {
            case "warning":
              return observableOf({ type: "retry" as const,
                                    value: { segment, error: evt.value } });
            case "interrupted":
              log.info("Stream: segment request interrupted temporarly.", segment);
              return EMPTY;

            case "ended":
              this._mediaSegmentRequest = null;
              const lastQueue = this._downloadQueue$.getValue().segmentQueue;
              if (lastQueue.length === 0) {
                return observableOf({ type : "end-of-queue" as const,
                                      value : null });
              } else if (lastQueue[0].segment.id === segment.id) {
                lastQueue.shift();
              }
              return recursivelyRequestSegments(lastQueue[0]);

            case "chunk":
            case "chunk-complete":
              this._mediaSegmentsAwaitingInitMetadata.add(segment.id);
              return this._initSegmentMetadata$.pipe(
                take(1),
                map((initTimescale) => {
                  if (evt.type === "chunk-complete") {
                    return { type: "end-of-segment" as const,
                             value: { segment } };
                  }
                  const parsed = evt.parse(initTimescale);
                  assert(parsed.segmentType === "media",
                         "Should have loaded a media segment.");
                  return objectAssign({},
                                      parsed,
                                      { type: "parsed-media" as const,
                                        segment });
                }),
                finalize(() => {
                  this._mediaSegmentsAwaitingInitMetadata.delete(segment.id);
                }));

            default:
              assertUnreachable(evt);
          }
        }));
    };

    return observableDefer(() =>
      recursivelyRequestSegments(currentNeededSegment)
    ).pipe(finalize(() => { this._mediaSegmentRequest = null; }));
  }

  /**
   * Internal logic performing initialization segment requests.
   * @param {Object} queuedInitSegment
   * @returns {Observable}
   */
  private _requestInitSegment(
    queuedInitSegment : IQueuedSegment | null
  ) : Observable<ILoaderRetryEvent |
                 IParsedInitSegmentEvent<T> |
                 IEndOfSegmentEvent> {
    if (queuedInitSegment === null) {
      this._initSegmentRequest = null;
      return EMPTY;
    }
    const { segment, priority } = queuedInitSegment;
    const context = objectAssign({ segment }, this._content);
    const request$ = this._segmentFetcher.createRequest(context, priority);

    this._initSegmentRequest = { segment, priority, request$ };
    return request$
      .pipe(mergeMap((evt) : Observable<ILoaderRetryEvent |
                                        IParsedInitSegmentEvent<T> |
                                        IEndOfSegmentEvent> =>
      {
        switch (evt.type) {
          case "warning":
            return observableOf({ type: "retry" as const,
                                  value: { segment, error: evt.value } });
          case "interrupted":
            log.info("Stream: init segment request interrupted temporarly.", segment);
            return EMPTY;

          case "chunk":
            const parsed = evt.parse(undefined);
            assert(parsed.segmentType === "init",
                   "Should have loaded an init segment.");
            return observableConcat(
              observableOf(objectAssign({},
                                        parsed,
                                        { type: "parsed-init" as const,
                                          segment })),

              // We want to emit parsing information strictly AFTER the
              // initialization segment is emitted. Hence why we perform this
              // side-effect a posteriori in a concat operator
              observableDefer(() => {
                if (parsed.segmentType === "init") {
                  this._initSegmentMetadata$.next(parsed.initTimescale);
                }
                return EMPTY;
              }));

          case "chunk-complete":
            return observableOf({ type: "end-of-segment" as const,
                                  value: { segment } });

          case "ended":
            return EMPTY; // Do nothing, just here to check every case
          default:
            assertUnreachable(evt);
        }
      })).pipe(finalize(() => { this._initSegmentRequest = null; }));
  }
}

/** Event sent by the DownloadingQueue. */
export type IDownloadingQueueEvent<T> = IParsedInitSegmentEvent<T> |
                                        IParsedSegmentEvent<T> |
                                        IEndOfSegmentEvent |
                                        ILoaderRetryEvent |
                                        IEndOfQueueEvent;

/**
 * Notify that the initialization segment has been fully loaded and parsed.
 *
 * You can now push that segment to its corresponding buffer and use its parsed
 * metadata.
 *
 * Only sent if an initialization segment exists (when the `DownloadingQueue`'s
 * `hasInitSegment` constructor option has been set to `true`).
 * In that case, an `IParsedInitSegmentEvent` will always be sent before any
 * `IParsedSegmentEvent` event is sent.
 */
export type IParsedInitSegmentEvent<T> = ISegmentParserParsedInitSegment<T> &
                                         { segment : ISegment;
                                           type : "parsed-init"; };

/**
 * Notify that a media chunk (decodable sub-part of a media segment) has been
 * loaded and parsed.
 *
 * If an initialization segment exists (when the `DownloadingQueue`'s
 * `hasInitSegment` constructor option has been set to `true`), an
 * `IParsedSegmentEvent` will always be sent AFTER the `IParsedInitSegmentEvent`
 * event.
 *
 * It can now be pushed to its corresponding buffer. Note that there might be
 * multiple `IParsedSegmentEvent` for a single segment, if that segment is
 * divided into multiple decodable chunks.
 * You will know that all `IParsedSegmentEvent` have been loaded for a given
 * segment once you received the `IEndOfSegmentEvent` for that segment.
 */
export type IParsedSegmentEvent<T> = ISegmentParserParsedSegment<T> &
                                     { segment : ISegment;
                                       type : "parsed-media"; };

/** Notify that a media or initialization segment has been fully-loaded. */
export interface IEndOfSegmentEvent { type : "end-of-segment";
                                      value: { segment : ISegment }; }

/**
 * Notify that a media or initialization segment request is retried.
 * This happened most likely because of an HTTP error.
 */
export interface ILoaderRetryEvent { type : "retry";
                                     value : { segment : ISegment;
                                               error : ICustomError; }; }

/**
 * Notify that the media segment queue is now empty.
 * This can be used to re-check if any segment are now needed.
 */
export interface IEndOfQueueEvent { type : "end-of-queue"; value : null }

/**
 * Structure of the object that has to be emitted through the `downloadQueue$`
 * Observable, to signal which segments are currently needed.
 */
export interface IDownloadQueueItem {
  /**
   * A potential initialization segment that needs to be loaded and parsed.
   * It will generally be requested in parralel of the first media segments.
   *
   * Can be set to `null` if you don't need to load the initialization segment
   * for now.
   *
   * If the `DownloadingQueue`'s `hasInitSegment` constructor option has been
   * set to `true`, no media segment will be parsed before the initialization
   * segment has been loaded and parsed.
   */
  initSegment : IQueuedSegment | null;

  /**
   * The queue of media segments currently needed for download.
   *
   * Those will be loaded from the first element in that queue to the last
   * element in it.
   *
   * Note that any media segments in the segment queue will only be parsed once
   * either of these is true:
   *   - An initialization segment has been loaded and parsed by this
   *     `DownloadingQueue` instance.
   *   - The `DownloadingQueue`'s `hasInitSegment` constructor option has been
   *     set to `false`.
   */
  segmentQueue : IQueuedSegment[];
}

/** Object describing a pending Segment request. */
interface ISegmentRequestObject<T> {
  /** The segment the request is for. */
  segment : ISegment;
  /** The request Observable itself. Can be used to update its priority. */
  request$ : Observable<IPrioritizedSegmentFetcherEvent<T>>;
  /** Last set priority of the segment request (lower number = higher priority). */
  priority : number;
}

/** Context for segments downloaded through the DownloadingQueue. */
export interface IDownloadingQueueContext {
  /** Adaptation linked to the segments you want to load. */
  adaptation : Adaptation;
  /** Manifest linked to the segments you want to load. */
  manifest : Manifest;
  /** Period linked to the segments you want to load. */
  period : Period;
  /** Representation linked to the segments you want to load. */
  representation : Representation;
}

/** Object describing a pending Segment request. */
interface ISegmentRequestObject<T> {
  /** The segment the request is for. */
  segment : ISegment;
  /** The request Observable itself. Can be used to update its priority. */
  request$ : Observable<IPrioritizedSegmentFetcherEvent<T>>;
  /** Last set priority of the segment request (lower number = higher priority). */
  priority : number;
}
