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

import log from "../../../../log";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../../manifest";
import { IPlayerError } from "../../../../public_types";
import {
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
} from "../../../../transports";
import assert from "../../../../utils/assert";
import EventEmitter from "../../../../utils/event_emitter";
import noop from "../../../../utils/noop";
import objectAssign from "../../../../utils/object_assign";
import createSharedReference, {
  IReadOnlySharedReference,
  ISharedReference,
} from "../../../../utils/reference";
import TaskCanceller from "../../../../utils/task_canceller";
import { IPrioritizedSegmentFetcher } from "../../../fetchers";
import { IQueuedSegment } from "../types";

/**
 * Class scheduling segment downloads for a single Representation.
 *
 * TODO The request scheduling abstractions might be simplified by integrating
 * the `DownloadingQueue` in the segment fetchers code, instead of having it as
 * an utilis of the `RepresentationStream` like here.
 * @class DownloadingQueue
 */
export default class DownloadingQueue<T>
  extends EventEmitter<IDownloadingQueueEvent<T>>
{
  /** Context of the Representation that will be loaded through this DownloadingQueue. */
  private _content : IDownloadingQueueContext;
  /**
   * Current queue of segments scheduled for download.
   *
   * Segments whose request are still pending are still in that queue. Segments
   * are only removed from it once their request has succeeded.
   */
  private _downloadQueue : IReadOnlySharedReference<IDownloadQueueItem>;
  /**
   * Allows to stop listening to queue updates and stop performing requests.
   * Set to `null` if the DownloadingQueue is not started right now.
   */
  private _currentCanceller : TaskCanceller | null;
  /**
   * Pending request for the initialization segment.
   * `null` if no request is pending for it.
   */
  private _initSegmentRequest : ISegmentRequestObject|null;
  /**
   * Pending request for a media (i.e. non-initialization) segment.
   * `null` if no request is pending for it.
   */
  private _mediaSegmentRequest : ISegmentRequestObject|null;
  /** Interface used to load segments. */
  private _segmentFetcher : IPrioritizedSegmentFetcher<T>;
  /**
   * Emit the timescale anounced in the initialization segment once parsed.
   * `undefined` when this is not yet known.
   * `null` when no initialization segment or timescale exists.
   */
  private _initSegmentInfoRef : ISharedReference<number | undefined | null>;
  /**
   * Some media segment might have been loaded and are only awaiting for the
   * initialization segment to be parsed before being parsed themselves.
   * This string will contain the `id` property of that segment if one exist or
   * `null` if no segment is awaiting an init segment.
   */
  private _mediaSegmentAwaitingInitMetadata : string | null;

  /**
   * Create a new `DownloadingQueue`.
   *
   * @param {Object} content - The context of the Representation you want to
   * load segments for.
   * @param {Object} downloadQueue - Queue of segments you want to load.
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
    downloadQueue : IReadOnlySharedReference<IDownloadQueueItem>,
    segmentFetcher : IPrioritizedSegmentFetcher<T>,
    hasInitSegment : boolean
  ) {
    super();
    this._content = content;
    this._currentCanceller = null;
    this._downloadQueue = downloadQueue;
    this._initSegmentRequest = null;
    this._mediaSegmentRequest = null;
    this._segmentFetcher = segmentFetcher;
    this._initSegmentInfoRef = createSharedReference(undefined);
    this._mediaSegmentAwaitingInitMetadata = null;
    if (!hasInitSegment) {
      this._initSegmentInfoRef.setValue(null);
    }
  }

  /**
   * Returns the initialization segment currently being requested.
   * Returns `null` if no initialization segment request is pending.
   * @returns {Object | null}
   */
  public getRequestedInitSegment() : ISegment | null {
    return this._initSegmentRequest === null ? null :
                                               this._initSegmentRequest.segment;
  }

  /**
   * Returns the media segment currently being requested.
   * Returns `null` if no media segment request is pending.
   * @returns {Object | null}
   */
  public getRequestedMediaSegment() : ISegment | null {
    return this._mediaSegmentRequest === null ? null :
                                                this._mediaSegmentRequest.segment;
  }

  /**
   * Start the current downloading queue, emitting events as it loads and parses
   * initialization and media segments.
   */
  public start() : void {
    if (this._currentCanceller !== null) {
      return ;
    }
    this._currentCanceller = new TaskCanceller();

    // Listen for asked media segments
    this._downloadQueue.onUpdate((queue) => {
      const { segmentQueue } = queue;

      if (segmentQueue.length > 0 &&
          segmentQueue[0].segment.id === this._mediaSegmentAwaitingInitMetadata)
      {
        // The most needed segment is still the same one, and there's no need to
        // update its priority as the request already ended, just quit.
        return;
      }

      const currentSegmentRequest = this._mediaSegmentRequest;
      if (segmentQueue.length === 0) {
        if (currentSegmentRequest === null) {
          // There's nothing to load but there's already no request pending.
          return;
        }
        log.debug("Stream: no more media segment to request. Cancelling queue.",
                  this._content.adaptation.type);
        this._restartMediaSegmentDownloadingQueue();
        return;
      } else if (currentSegmentRequest === null) {
        // There's no request although there are needed segments: start requests
        log.debug("Stream: Media segments now need to be requested. Starting queue.",
                  this._content.adaptation.type, segmentQueue.length);
        this._restartMediaSegmentDownloadingQueue();
        return;
      } else {
        const nextItem = segmentQueue[0];
        if (currentSegmentRequest.segment.id !== nextItem.segment.id) {
          // The most important request if for another segment, request it
          log.debug("Stream: Next media segment changed, cancelling previous",
                    this._content.adaptation.type);
          this._restartMediaSegmentDownloadingQueue();
          return;
        }
        if (currentSegmentRequest.priority !== nextItem.priority) {
          // The priority of the most important request has changed, update it
          log.debug("Stream: Priority of next media segment changed, updating",
                    this._content.adaptation.type,
                    currentSegmentRequest.priority,
                    nextItem.priority);
          this._segmentFetcher.updatePriority(currentSegmentRequest.request,
                                              nextItem.priority);
        }
        return;
      }
    }, { emitCurrentValue: true, clearSignal: this._currentCanceller.signal });

    // Listen for asked init segment
    this._downloadQueue.onUpdate((next) => {
      const initSegmentRequest = this._initSegmentRequest;
      if (next.initSegment !== null && initSegmentRequest !== null) {
        if (next.initSegment.priority !== initSegmentRequest.priority) {
          this._segmentFetcher.updatePriority(initSegmentRequest.request,
                                              next.initSegment.priority);
        }
        return;
      } else if (next.initSegment?.segment.id === initSegmentRequest?.segment.id) {
        return ;
      }
      if (next.initSegment === null) {
        log.debug("Stream: no more init segment to request. Cancelling queue.",
                  this._content.adaptation.type);
      }
      this._restartInitSegmentDownloadingQueue(next.initSegment);
    }, { emitCurrentValue: true, clearSignal: this._currentCanceller.signal });
  }

  public stop() {
    this._currentCanceller?.cancel();
    this._currentCanceller = null;
  }

  /**
   * Internal logic performing media segment requests.
   */
  private _restartMediaSegmentDownloadingQueue() : void {
    if (this._mediaSegmentRequest !== null) {
      this._mediaSegmentRequest.canceller.cancel();
    }
    const { segmentQueue } = this._downloadQueue.getValue();
    const currentNeededSegment = segmentQueue[0];
    const recursivelyRequestSegments = (
      startingSegment : IQueuedSegment | undefined
    ) : void  => {
      if (this._currentCanceller !== null && this._currentCanceller.isUsed()) {
        this._mediaSegmentRequest = null;
        return;
      }
      if (startingSegment === undefined) {
        this._mediaSegmentRequest = null;
        this.trigger("emptyQueue", null);
        return;
      }
      const canceller = new TaskCanceller();
      const unlinkCanceller = this._currentCanceller === null ?
        noop :
        canceller.linkToSignal(this._currentCanceller.signal);

      const { segment, priority } = startingSegment;
      const context = objectAssign({ segment }, this._content);

      /**
       * If `true` , the current task has either errored, finished, or was
       * cancelled.
       */
      let isComplete = false;

      /**
       * If true, we're currently waiting for the initialization segment to be
       * parsed before parsing a received chunk.
       */
      let isWaitingOnInitSegment = false;

      canceller.signal.register(() => {
        this._mediaSegmentRequest = null;
        if (isComplete) {
          return;
        }
        if (this._mediaSegmentAwaitingInitMetadata === segment.id) {
          this._mediaSegmentAwaitingInitMetadata = null;
        }
        isComplete = true;
        isWaitingOnInitSegment = false;
      });
      const emitChunk = (
        parsed : ISegmentParserParsedInitChunk<T> |
                 ISegmentParserParsedMediaChunk<T>
      ) : void => {
        assert(parsed.segmentType === "media", "Should have loaded a media segment.");
        this.trigger("parsedMediaSegment", objectAssign({}, parsed, { segment }));
      };


      const continueToNextSegment = () : void => {
        const lastQueue = this._downloadQueue.getValue().segmentQueue;
        if (lastQueue.length === 0) {
          isComplete = true;
          this.trigger("emptyQueue", null);
          return;
        } else if (lastQueue[0].segment.id === segment.id) {
          lastQueue.shift();
        }
        isComplete = true;
        recursivelyRequestSegments(lastQueue[0]);
      };

      /** Scheduled actual segment request. */
      const request = this._segmentFetcher.createRequest(context, priority, {
        /**
         * Callback called when the request has to be retried.
         * @param {Error} error
         */
        onRetry: (error : IPlayerError) : void => {
          this.trigger("requestRetry", { segment, error });
        },

        /**
         * Callback called when the request has to be interrupted and
         * restarted later.
         */
        beforeInterrupted() {
          log.info("Stream: segment request interrupted temporarly.",
                   segment.id,
                   segment.time);
        },

        /**
         * Callback called when a decodable chunk of the segment is available.
         * @param {Function} parse - Function allowing to parse the segment.
         */
        onChunk: (
          parse : (
            initTimescale : number | undefined
          ) => ISegmentParserParsedInitChunk<T> | ISegmentParserParsedMediaChunk<T>
        ) : void => {
          const initTimescale = this._initSegmentInfoRef.getValue();
          if (initTimescale !== undefined) {
            emitChunk(parse(initTimescale ?? undefined));
          } else {
            isWaitingOnInitSegment = true;

            // We could also technically call `waitUntilDefined` in both cases,
            // but I found it globally clearer to segregate the two cases,
            // especially to always have a meaningful `isWaitingOnInitSegment`
            // boolean which is a very important variable.
            this._initSegmentInfoRef.waitUntilDefined((actualTimescale) => {
              emitChunk(parse(actualTimescale ?? undefined));
            }, { clearSignal: canceller.signal });
          }
        },

        /** Callback called after all chunks have been sent. */
        onAllChunksReceived: () : void => {
          if (!isWaitingOnInitSegment) {
            this.trigger("fullyLoadedSegment", segment);
          } else {
            this._mediaSegmentAwaitingInitMetadata = segment.id;
            this._initSegmentInfoRef.waitUntilDefined(() => {
              this._mediaSegmentAwaitingInitMetadata = null;
              isWaitingOnInitSegment = false;
              this.trigger("fullyLoadedSegment", segment);
            }, { clearSignal: canceller.signal });
          }
        },

        /**
         * Callback called right after the request ended but before the next
         * requests are scheduled. It is used to schedule the next segment.
         */
        beforeEnded: () : void => {
          unlinkCanceller();
          this._mediaSegmentRequest = null;

          if (isWaitingOnInitSegment) {
            this._initSegmentInfoRef.waitUntilDefined(continueToNextSegment,
                                                      { clearSignal: canceller.signal });
          } else {
            continueToNextSegment();
          }
        },

      }, canceller.signal);

      request.catch((error : unknown) => {
        unlinkCanceller();
        if (!isComplete) {
          isComplete = true;
          this.stop();
          this.trigger("error", error);
        }
      });

      this._mediaSegmentRequest = { segment, priority, request, canceller };
    };
    recursivelyRequestSegments(currentNeededSegment);
  }

  /**
   * Internal logic performing initialization segment requests.
   * @param {Object} queuedInitSegment
   */
  private _restartInitSegmentDownloadingQueue(
    queuedInitSegment : IQueuedSegment | null
  ) : void {
    if (this._currentCanceller !== null && this._currentCanceller.isUsed()) {
      return;
    }
    if (this._initSegmentRequest !== null) {
      this._initSegmentRequest.canceller.cancel();
    }
    if (queuedInitSegment === null) {
      return ;
    }

    const canceller = new TaskCanceller();
    const unlinkCanceller = this._currentCanceller === null ?
      noop :
      canceller.linkToSignal(this._currentCanceller.signal);
    const { segment, priority } = queuedInitSegment;
    const context = objectAssign({ segment }, this._content);

    /**
     * If `true` , the current task has either errored, finished, or was
     * cancelled.
     */
    let isComplete = false;

    const request = this._segmentFetcher.createRequest(context, priority, {
      onRetry: (err : IPlayerError) : void => {
        this.trigger("requestRetry", { segment, error: err });
      },
      beforeInterrupted: () => {
        log.info("Stream: init segment request interrupted temporarly.", segment.id);
      },
      beforeEnded: () => {
        unlinkCanceller();
        this._initSegmentRequest = null;
        isComplete = true;
      },
      onChunk: (parse : (x : undefined) => ISegmentParserParsedInitChunk<T> |
                                           ISegmentParserParsedMediaChunk<T>) : void => {
        const parsed = parse(undefined);
        assert(parsed.segmentType === "init", "Should have loaded an init segment.");
        this.trigger("parsedInitSegment", objectAssign({}, parsed, { segment }));
        if (parsed.segmentType === "init") {
          this._initSegmentInfoRef.setValue(parsed.initTimescale ?? null);
        }
      },
      onAllChunksReceived: () : void => {
        this.trigger("fullyLoadedSegment", segment);
      },
    }, canceller.signal);

    request.catch((error : unknown) => {
      unlinkCanceller();
      if (!isComplete) {
        isComplete = true;
        this.stop();
        this.trigger("error", error);
      }
    });

    canceller.signal.register(() => {
      this._initSegmentRequest = null;
      if (isComplete) {
        return;
      }
      isComplete = true;
    });

    this._initSegmentRequest = { segment, priority, request, canceller };
  }
}

/**
 * Events sent by the `DownloadingQueue`.
 *
 * The key is the event's name and the value the format of the corresponding
 * event's payload.
 */
export interface IDownloadingQueueEvent<T> {
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
  parsedInitSegment : IParsedInitSegmentPayload<T>;
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
  parsedMediaSegment : IParsedSegmentPayload<T>;
  /** Notify that a media or initialization segment has been fully-loaded. */
  fullyLoadedSegment : ISegment;
  /**
   * Notify that a media or initialization segment request is retried.
   * This happened most likely because of an HTTP error.
   */
  requestRetry : IRequestRetryPayload;
  /**
   * Notify that the media segment queue is now empty.
   * This can be used to re-check if any segment are now needed.
   */
  emptyQueue : null;
  /**
   * Notify that a fatal error happened (such as request failures), which has
   * completely stopped the downloading queue.
   *
   * You may still restart the queue after receiving this event.
   */
  error : unknown;
}

/** Payload for a `parsedInitSegment` event. */
export type IParsedInitSegmentPayload<T> = ISegmentParserParsedInitChunk<T> &
                                           { segment : ISegment };
/** Payload for a `parsedMediaSegment` event. */
export type IParsedSegmentPayload<T> = ISegmentParserParsedMediaChunk<T> &
                                       { segment : ISegment };
/** Payload for a `requestRetry` event. */
export interface IRequestRetryPayload {
  segment : ISegment;
  error : IPlayerError;
}

/**
 * Structure of the object that has to be emitted through the `downloadQueue`
 * shared reference, to signal which segments are currently needed.
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
interface ISegmentRequestObject {
  /** The segment the request is for. */
  segment : ISegment;
  /** The request itself. Can be used to update its priority. */
  request: Promise<void>;
  /** Last set priority of the segment request (lower number = higher priority). */
  priority : number;
  /** Allows to cancel that segment from being requested. */
  canceller : TaskCanceller;
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
