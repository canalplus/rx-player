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
  defer as observableDefer,
  Observable,
  of as observableOf,
  merge as observableMerge,
  EMPTY,
  ReplaySubject,
  Subject,
} from "rxjs";
import {
  filter,
  finalize,
  map,
  mergeMap,
  share,
  switchMap,
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
  ISegmentParserInitSegment,
  ISegmentParserSegment,
} from "../../../transports";
import assertUnreachable from "../../../utils/assert_unreachable";
import objectAssign from "../../../utils/object_assign";
import {
  IPrioritizedSegmentFetcher,
  IPrioritizedSegmentFetcherEvent,
} from "../../fetchers";
import {
  IQueuedSegment,
} from "../types";

/** Event sent by the DownloadingQueue. */
export type IDownloadingQueueEvent<T> = IParsedSegmentEvent<T> |
                                        IParsedInitSegmentEvent<T> |
                                        IEndOfSegmentEvent |
                                        ILoaderRetryEvent |
                                        IEndOfQueueEvent;

/** Notify that the initialization segment has been parsed. */
export type IParsedInitSegmentEvent<T> = ISegmentParserInitSegment<T> &
                                         { segment : ISegment };

/** Notify that a media segment has been parsed. */
export type IParsedSegmentEvent<T> = ISegmentParserSegment<T> &
                                     { segment : ISegment };

/** Notify that a segment has been fully-loaded. */
export interface IEndOfSegmentEvent { type : "end-of-segment";
                                      value: { segment : ISegment }; }

/** Notify that a segment request is retried. */
export interface ILoaderRetryEvent { type : "retry";
                                     value : { segment : ISegment;
                                               error : ICustomError; }; }

/** Notify that the media segment queue is now empty. */
export interface IEndOfQueueEvent { type : "end-of-queue"; value : null }

/**
 * Items emitted through the "downloadQueue$" observable, passed to the
 * DownloadingQueue.
 */
export interface IDownloadQueueItem {
  /**
   * Set when an initialization segment needs to be loaded.
   * It is generally requested in parralel of any media segment.
   */
  initSegment : IQueuedSegment | null;

  /** The queue of segments currently needed for download.  */
  segmentQueue : IQueuedSegment[];
}

/** Object describing a pending Segment request. */
interface ISegmentRequestObject<T> {
  /** The segment the request is for. */
  segment : ISegment; // The Segment the request is for
  /** The request Observable itself. Can be used to update its priority. */
  request$ : Observable<IPrioritizedSegmentFetcherEvent<T>>;
  /** Last set priority of the segment request (lower number = higher priority). */
  priority : number; // The current priority of the request
}

/** Context for segments downloaded through the DownloadingQueue. */
export interface IContent {
  adaptation : Adaptation;
  manifest : Manifest;
  period : Period;
  representation : Representation;
}

/**
 * Class scheduling segment downloads for a single Representation according the given
 * `downloadQueue$`.
 * @class DownloadingQueue
 */
export default class DownloadingQueue<T> {
  /** Context of the Representation that will be loaded through this DownloadingQueue. */
  private _content : IContent;
  /**
   * DownloadingQueue Observable.
   * We only can have maximum one at a time.
   * `null` when `start` has never been called.
   */
  private _currentObs$ : Observable<IDownloadingQueueEvent<T>> | null;
  /** Queue of segments scheduled for download. */
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

  /**
   * Create a new DownloadingQueue.
   * @param {Object} content - The context of the Representation you want to
   * load segments for.
   * @param {BehaviorSubject} downloadQueue$ - Emit the queue of segments you
   * want to load.
   * @param {Object} segmentFetcher - Interface to facilitate the download of
   * segments.
   */
  constructor(
    content: IContent,
    downloadQueue$ : BehaviorSubject<IDownloadQueueItem>,
    segmentFetcher : IPrioritizedSegmentFetcher<T>
  ) {
    this._content = content;
    this._currentObs$ = null;
    this._downloadQueue$ = downloadQueue$;
    this._initSegmentRequest = null;
    this._mediaSegmentRequest = null;
    this._segmentFetcher = segmentFetcher;
  }

  /**
   * Returns the initialization segment currently being requested.
   * Returns `null` if no initialization segment request is pending.
   * @returns {Object}
   */
  public getCurrentInitRequest() : ISegment | null {
    return this._initSegmentRequest === null ? null :
                                               this._initSegmentRequest.segment;
  }

  /**
   * Returns the media segment currently being requested.
   * Returns `null` if no media segment request is pending.
   * @returns {Object}
   */
  public getCurrentMediaRequest() : ISegment | null {
    return this._mediaSegmentRequest === null ? null :
                                                this._mediaSegmentRequest.segment;
  }

  public start() : Observable<IDownloadingQueueEvent<T>> {
    if (this._currentObs$ !== null) {
      return this._currentObs$;
    }
    /** Emit the timescale anounced in the initialization segment when parsed. */
    const initSegmentTimescale$ = new ReplaySubject<number|undefined>(1);
    const obs = observableDefer(() => {
      const mediaQueue$ = this._downloadQueue$.pipe(
        filter(({ segmentQueue }) => {
          const currentSegmentRequest = this._mediaSegmentRequest;
          if (segmentQueue.length === 0) {
            return currentSegmentRequest !== null;
          } else if (currentSegmentRequest === null) {
            return true;
          }
          if (currentSegmentRequest.segment.id !== segmentQueue[0].segment.id) {
            return true;
          }
          if (currentSegmentRequest.priority !== segmentQueue[0].priority) {
            this._segmentFetcher.updatePriority(currentSegmentRequest.request$,
                                                segmentQueue[0].priority);
          }
          return false;
        }),
        switchMap(({ segmentQueue }) =>
          segmentQueue.length > 0 ? this._requestMediaSegments(initSegmentTimescale$) :
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
          return this._requestInitSegment(nextQueue.initSegment, initSegmentTimescale$);
        }));

      return observableMerge(initSegmentPush$, mediaQueue$);
    }).pipe(share());

    this._currentObs$ = obs;

    return obs;
  }

  /**
   * @param {BehaviorSubject} initSegmentTimescale$
   * @returns {Observable}
   */
  private _requestMediaSegments(
    initSegmentTimescale$ : Subject<number|undefined>
  ) : Observable<IDownloadingQueueEvent<T>> {
    const { segmentQueue } = this._downloadQueue$.getValue();
    const currentNeededSegment = segmentQueue[0];
    const recursivelyRequestSegments = (
      startingSegment : IQueuedSegment | undefined
    ) : Observable<IDownloadingQueueEvent<T>> => {
      if (startingSegment === undefined) {
        return observableOf({ type : "end-of-queue",
                              value : null });
      }
      const { segment, priority } = startingSegment;
      const context = objectAssign({ segment }, this._content);
      const request$ = this._segmentFetcher.createRequest(context, priority);

      this._mediaSegmentRequest = { segment, priority, request$ };
      return request$
        .pipe(mergeMap((evt) : Observable<IDownloadingQueueEvent<T>> => {
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
                return observableOf({ type : "end-of-queue",
                                      value : null });
              } else if (lastQueue[0].segment.id === segment.id) {
                lastQueue.shift();
              }
              return recursivelyRequestSegments(lastQueue[0]);

            case "chunk":
            case "chunk-complete":
              return initSegmentTimescale$.pipe(
                mergeMap((initTimescale) => {
                  if (evt.type === "chunk-complete") {
                    return observableOf({ type: "end-of-segment" as const,
                                          value: { segment } });
                  }
                  return evt.parse(initTimescale).pipe(map(parserResponse => {
                    return objectAssign({ segment }, parserResponse);
                  }));
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
   * @param {Object} queuedInitSegment
   * @param {BehaviorSubject} initSegmentTimescale$
   * @returns {Observable}
   */
  private _requestInitSegment(
    queuedInitSegment : IQueuedSegment | null,
    initSegmentTimescale$ : Subject<number | undefined>
  ) : Observable<IDownloadingQueueEvent<T>> {
    if (queuedInitSegment === null) {
      this._initSegmentRequest = null;
      return EMPTY;
    }
    const { segment, priority } = queuedInitSegment;
    const context = objectAssign({ segment }, this._content);
    const request$ = this._segmentFetcher.createRequest(context, priority);

    this._initSegmentRequest = { segment, priority, request$ };
    return request$
      .pipe(mergeMap((evt) : Observable<IDownloadingQueueEvent<T>> => {
        switch (evt.type) {
          case "warning":
            return observableOf({ type: "retry" as const,
                                  value: { segment, error: evt.value } });
          case "interrupted":
            log.info("Stream: init segment request interrupted temporarly.", segment);
            return EMPTY;

          case "chunk":
            return evt.parse(undefined).pipe(map(parserResponse => {
              if (parserResponse.type === "parsed-init-segment") {
                initSegmentTimescale$.next(parserResponse.value.initTimescale);
              }
              return objectAssign({ segment }, parserResponse);
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
