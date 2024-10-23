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

import log from "../../../log";
import type {
  IManifest,
  IAdaptation,
  ISegment,
  IPeriod,
  IRepresentation,
} from "../../../manifest";
import type { IPlayerError } from "../../../public_types";
import type {
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
} from "../../../transports";
import assert from "../../../utils/assert";
import EventEmitter from "../../../utils/event_emitter";
import noop from "../../../utils/noop";
import objectAssign from "../../../utils/object_assign";
import SharedReference from "../../../utils/reference";
import TaskCanceller from "../../../utils/task_canceller";
import type { IPrioritizedSegmentFetcher } from "./prioritized_segment_fetcher";

/** Information about a Segment waiting to be loaded by the SegmentQueue. */
export interface IQueuedSegment {
  /** Priority of the segment request (lower number = higher priority). */
  priority: number;
  /** Segment wanted. */
  segment: ISegment;
}

/**
 * Class scheduling segment downloads as a FIFO queue.
 */
export default class SegmentQueue<T> extends EventEmitter<ISegmentQueueEvent<T>> {
  /** Interface used to load segments. */
  private _segmentFetcher: IPrioritizedSegmentFetcher<T>;

  /**
   * Metadata on the content for which segments are currently loaded.
   * `null` if no queue is active.
   */
  private _currentContentInfo: ISegmentQueueContentInfo | null;

  /**
   * Create a new `SegmentQueue`.
   *
   * @param {Object} segmentFetcher - Interface to facilitate the download of
   * segments.
   */
  constructor(segmentFetcher: IPrioritizedSegmentFetcher<T>) {
    super();
    this._segmentFetcher = segmentFetcher;
    this._currentContentInfo = null;
  }

  /**
   * Returns the initialization segment currently being requested.
   * Returns `null` if no initialization segment request is pending.
   * @returns {Object | null}
   */
  public getRequestedInitSegment(): ISegment | null {
    return this._currentContentInfo?.initSegmentRequest?.segment ?? null;
  }

  /**
   * Returns the media segment currently being requested.
   * Returns `null` if no media segment request is pending.
   * @returns {Object | null}
   */
  public getRequestedMediaSegment(): ISegment | null {
    return this._currentContentInfo?.mediaSegmentRequest?.segment ?? null;
  }

  /**
   * Return an object allowing to schedule segment requests linked to the given
   * content.
   * The `SegmentQueue` will emit events as it loads and parses initialization
   * and media segments.
   *
   * Calling this method resets all previous queues that were previously started
   * on the same instance.
   *
   * @param {Object} content - The context of the Representation you want to
   * load segments for.
   * @param {boolean} hasInitSegment - Declare that an initialization segment
   * will need to be downloaded.
   *
   * A `SegmentQueue` ALWAYS wait for the initialization segment to be
   * loaded and parsed before parsing a media segment.
   *
   * In cases where no initialization segment exist, this would lead to the
   * `SegmentQueue` waiting indefinitely for it.
   *
   * By setting that value to `false`, you anounce to the `SegmentQueue`
   * that it should not wait for an initialization segment before parsing a
   * media segment.
   * @returns {Object} - `SharedReference` on which the queue of segment for
   * that content can be communicated and updated. See type for more
   * information.
   */
  public resetForContent(
    content: ISegmentQueueContext,
    hasInitSegment: boolean,
    canStream: SharedReference<boolean | undefined>,
  ): SharedReference<ISegmentQueueItem> {
    this._currentContentInfo?.currentCanceller.cancel();
    const downloadQueue = new SharedReference<ISegmentQueueItem>({
      initSegment: null,
      segmentQueue: [],
    });
    const currentCanceller = new TaskCanceller();
    currentCanceller.signal.register(() => {
      downloadQueue.finish();
    });
    const currentContentInfo: ISegmentQueueContentInfo = {
      content,
      downloadQueue,
      initSegmentInfoRef: hasInitSegment
        ? new SharedReference<number | undefined | null>(undefined)
        : new SharedReference<number | undefined | null>(null),
      currentCanceller,
      initSegmentRequest: null,
      mediaSegmentRequest: null,
      mediaSegmentAwaitingInitMetadata: null,
      canStream,
    };
    this._currentContentInfo = currentContentInfo;

    // Listen for asked media segments
    downloadQueue.onUpdate(
      (queue) => {
        const { segmentQueue } = queue;

        if (
          segmentQueue.length > 0 &&
          segmentQueue[0].segment.id ===
            currentContentInfo.mediaSegmentAwaitingInitMetadata
        ) {
          // The most needed segment is still the same one, and there's no need to
          // update its priority as the request already ended, just quit.
          return;
        }

        const currentSegmentRequest = currentContentInfo.mediaSegmentRequest;
        if (segmentQueue.length === 0) {
          if (currentSegmentRequest === null) {
            // There's nothing to load but there's already no request pending.
            return;
          }
          log.debug(
            "SQ: no more media segment to request. Cancelling queue.",
            content.adaptation.type,
          );
          this._restartMediaSegmentDownloadingQueue(currentContentInfo);
          return;
        } else if (currentSegmentRequest === null) {
          // There's no request although there are needed segments: start requests
          log.debug(
            "SQ: Media segments now need to be requested. Starting queue.",
            content.adaptation.type,
            segmentQueue.length,
          );
          this._restartMediaSegmentDownloadingQueue(currentContentInfo);
          return;
        } else {
          const nextItem = segmentQueue[0];
          if (currentSegmentRequest.segment.id !== nextItem.segment.id) {
            // The most important request if for another segment, request it
            log.debug(
              "SQ: Next media segment changed, cancelling previous",
              content.adaptation.type,
            );
            this._restartMediaSegmentDownloadingQueue(currentContentInfo);
            return;
          }
          if (currentSegmentRequest.priority !== nextItem.priority) {
            // The priority of the most important request has changed, update it
            log.debug(
              "SQ: Priority of next media segment changed, updating",
              content.adaptation.type,
              currentSegmentRequest.priority,
              nextItem.priority,
            );
            this._segmentFetcher.updatePriority(
              currentSegmentRequest.request,
              nextItem.priority,
            );
          }
          return;
        }
      },
      { emitCurrentValue: true, clearSignal: currentCanceller.signal },
    );

    // Listen for asked init segment
    downloadQueue.onUpdate(
      (next) => {
        const initSegmentRequest = currentContentInfo.initSegmentRequest;
        if (next.initSegment !== null && initSegmentRequest !== null) {
          if (next.initSegment.priority !== initSegmentRequest.priority) {
            this._segmentFetcher.updatePriority(
              initSegmentRequest.request,
              next.initSegment.priority,
            );
          }
          return;
        } else if (next.initSegment?.segment.id === initSegmentRequest?.segment.id) {
          return;
        }
        if (next.initSegment === null) {
          log.debug(
            "SQ: no more init segment to request. Cancelling queue.",
            content.adaptation.type,
          );
        }
        this._restartInitSegmentDownloadingQueue(currentContentInfo, next.initSegment);
      },
      { emitCurrentValue: true, clearSignal: currentCanceller.signal },
    );

    return downloadQueue;
  }

  /**
   * Stop the currently-active `SegmentQueue`.
   *
   * Do nothing if no queue is active.
   */
  public stop() {
    this._currentContentInfo?.currentCanceller.cancel();
    this._currentContentInfo = null;
  }

  /**
   * Internal logic performing media segment requests.
   */
  private _restartMediaSegmentDownloadingQueue(
    contentInfo: ISegmentQueueContentInfo,
  ): void {
    if (contentInfo.mediaSegmentRequest !== null) {
      contentInfo.mediaSegmentRequest.canceller.cancel();
    }

    const { downloadQueue, content, initSegmentInfoRef, currentCanceller } = contentInfo;

    const recursivelyRequestSegments = (): void => {
      if (contentInfo.canStream.getValue() === false) {
        log.info("SQ: Segment fetching postponed because it cannot stream now.");
        return;
      }
      const { segmentQueue } = downloadQueue.getValue();
      const startingSegment = segmentQueue[0];
      if (currentCanceller !== null && currentCanceller.isUsed()) {
        contentInfo.mediaSegmentRequest = null;
        return;
      }
      if (startingSegment === undefined) {
        contentInfo.mediaSegmentRequest = null;
        this.trigger("emptyQueue", null);
        return;
      }
      const canceller = new TaskCanceller();
      const unlinkCanceller =
        currentCanceller === null
          ? noop
          : canceller.linkToSignal(currentCanceller.signal);

      const { segment, priority } = startingSegment;
      const context = objectAssign(
        { segment, nextSegment: segmentQueue[1]?.segment },
        content,
      );

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
        contentInfo.mediaSegmentRequest = null;
        if (isComplete) {
          return;
        }
        if (contentInfo.mediaSegmentAwaitingInitMetadata === segment.id) {
          contentInfo.mediaSegmentAwaitingInitMetadata = null;
        }
        isComplete = true;
        isWaitingOnInitSegment = false;
      });
      const emitChunk = (
        parsed: ISegmentParserParsedInitChunk<T> | ISegmentParserParsedMediaChunk<T>,
      ): void => {
        assert(parsed.segmentType === "media", "Should have loaded a media segment.");
        this.trigger("parsedMediaSegment", objectAssign({}, parsed, { segment }));
      };

      const continueToNextSegment = (): void => {
        const lastQueue = downloadQueue.getValue().segmentQueue;
        if (lastQueue.length === 0) {
          isComplete = true;
          this.trigger("emptyQueue", null);
          return;
        } else if (lastQueue[0].segment.id === segment.id) {
          lastQueue.shift();
        }
        isComplete = true;
        recursivelyRequestSegments();
      };

      /** Scheduled actual segment request. */
      const request = this._segmentFetcher.createRequest(
        context,
        priority,
        {
          /**
           * Callback called when the request has to be retried.
           * @param {Error} error
           */
          onRetry: (error: IPlayerError): void => {
            this.trigger("requestRetry", { segment, error });
          },

          /**
           * Callback called when the request has to be interrupted and
           * restarted later.
           */
          beforeInterrupted() {
            log.info(
              "SQ: segment request interrupted temporarly.",
              segment.id,
              segment.time,
            );
          },

          /**
           * Callback called when a decodable chunk of the segment is available.
           * @param {Function} parse - Function allowing to parse the segment.
           */
          onChunk: (
            parse: (
              initTimescale: number | undefined,
            ) => ISegmentParserParsedInitChunk<T> | ISegmentParserParsedMediaChunk<T>,
          ): void => {
            const initTimescale = initSegmentInfoRef.getValue();
            if (initTimescale !== undefined) {
              emitChunk(parse(initTimescale ?? undefined));
            } else {
              isWaitingOnInitSegment = true;

              // We could also technically call `waitUntilDefined` in both cases,
              // but I found it globally clearer to segregate the two cases,
              // especially to always have a meaningful `isWaitingOnInitSegment`
              // boolean which is a very important variable.
              initSegmentInfoRef.waitUntilDefined(
                (actualTimescale) => {
                  emitChunk(parse(actualTimescale ?? undefined));
                },
                { clearSignal: canceller.signal },
              );
            }
          },

          /** Callback called after all chunks have been sent. */
          onAllChunksReceived: (): void => {
            if (!isWaitingOnInitSegment) {
              this.trigger("fullyLoadedSegment", segment);
            } else {
              contentInfo.mediaSegmentAwaitingInitMetadata = segment.id;
              initSegmentInfoRef.waitUntilDefined(
                () => {
                  contentInfo.mediaSegmentAwaitingInitMetadata = null;
                  isWaitingOnInitSegment = false;
                  this.trigger("fullyLoadedSegment", segment);
                },
                { clearSignal: canceller.signal },
              );
            }
          },

          /**
           * Callback called right after the request ended but before the next
           * requests are scheduled. It is used to schedule the next segment.
           */
          beforeEnded: (): void => {
            unlinkCanceller();
            contentInfo.mediaSegmentRequest = null;

            if (isWaitingOnInitSegment) {
              initSegmentInfoRef.waitUntilDefined(continueToNextSegment, {
                clearSignal: canceller.signal,
              });
            } else {
              continueToNextSegment();
            }
          },
        },
        canceller.signal,
      );

      request.catch((error: unknown) => {
        unlinkCanceller();
        if (!isComplete) {
          isComplete = true;
          this.stop();
          this.trigger("error", error);
        }
      });

      contentInfo.mediaSegmentRequest = { segment, priority, request, canceller };
    };
    recursivelyRequestSegments();
  }

  /**
   * Internal logic performing initialization segment requests.
   * @param {Object} contentInfo
   * @param {Object} queuedInitSegment
   */
  private _restartInitSegmentDownloadingQueue(
    contentInfo: ISegmentQueueContentInfo,
    queuedInitSegment: IQueuedSegment | null,
  ): void {
    const { content, initSegmentInfoRef } = contentInfo;

    if (contentInfo.initSegmentRequest !== null) {
      contentInfo.initSegmentRequest.canceller.cancel();
    }
    if (queuedInitSegment === null) {
      return;
    }

    const canceller = new TaskCanceller();
    const unlinkCanceller =
      contentInfo.currentCanceller === null
        ? noop
        : canceller.linkToSignal(contentInfo.currentCanceller.signal);
    const { segment, priority } = queuedInitSegment;
    const context = objectAssign({ segment, nextSegment: undefined }, content);

    /**
     * If `true` , the current task has either errored, finished, or was
     * cancelled.
     */
    let isComplete = false;

    const request = this._segmentFetcher.createRequest(
      context,
      priority,
      {
        onRetry: (err: IPlayerError): void => {
          this.trigger("requestRetry", { segment, error: err });
        },
        beforeInterrupted: () => {
          log.info("SQ: init segment request interrupted temporarly.", segment.id);
        },
        beforeEnded: () => {
          unlinkCanceller();
          contentInfo.initSegmentRequest = null;
          isComplete = true;
        },
        onChunk: (
          parse: (
            x: undefined,
          ) => ISegmentParserParsedInitChunk<T> | ISegmentParserParsedMediaChunk<T>,
        ): void => {
          const parsed = parse(undefined);
          assert(parsed.segmentType === "init", "Should have loaded an init segment.");
          this.trigger("parsedInitSegment", objectAssign({}, parsed, { segment }));
          if (parsed.segmentType === "init") {
            initSegmentInfoRef.setValue(parsed.initTimescale ?? null);
          }
        },
        onAllChunksReceived: (): void => {
          this.trigger("fullyLoadedSegment", segment);
        },
      },
      canceller.signal,
    );

    request.catch((error: unknown) => {
      unlinkCanceller();
      if (!isComplete) {
        isComplete = true;
        this.stop();
        this.trigger("error", error);
      }
    });

    canceller.signal.register(() => {
      contentInfo.initSegmentRequest = null;
      if (isComplete) {
        return;
      }
      isComplete = true;
    });

    contentInfo.initSegmentRequest = { segment, priority, request, canceller };
  }
}

/**
 * Events sent by the `SegmentQueue`.
 *
 * The key is the event's name and the value the format of the corresponding
 * event's payload.
 */
export interface ISegmentQueueEvent<T> {
  /**
   * Notify that the initialization segment has been fully loaded and parsed.
   *
   * You can now push that segment to its corresponding buffer and use its parsed
   * metadata.
   *
   * Only sent if an initialization segment exists (when the `SegmentQueue`'s
   * `hasInitSegment` constructor option has been set to `true`).
   * In that case, an `IParsedInitSegmentEvent` will always be sent before any
   * `IParsedSegmentEvent` event is sent.
   */
  parsedInitSegment: IParsedInitSegmentPayload<T>;
  /**
   * Notify that a media chunk (decodable sub-part of a media segment) has been
   * loaded and parsed.
   *
   * If an initialization segment exists (when the `SegmentQueue`'s
   * `hasInitSegment` constructor option has been set to `true`), an
   * `IParsedSegmentEvent` will always be sent AFTER the `IParsedInitSegmentEvent`
   * event.
   *
   * It can now be pushed to its corresponding buffer. Note that there might be
   * multiple `IParsedSegmentEvent` for a single segment, if that segment is
   * divided into multiple decodable chunks.
   * You will know that all `IParsedSegmentEvent` have been loaded for a given
   * segment once you received the corresponding event.
   */
  parsedMediaSegment: IParsedSegmentPayload<T>;
  /** Notify that a media or initialization segment has been fully-loaded. */
  fullyLoadedSegment: ISegment;
  /**
   * Notify that a media or initialization segment request is retried.
   * This happened most likely because of an HTTP error.
   */
  requestRetry: IRequestRetryPayload;
  /**
   * Notify that the media segment queue is now empty.
   * This can be used to re-check if any segment are now needed.
   */
  emptyQueue: null;
  /**
   * Notify that a fatal error happened (such as request failures), which has
   * completely stopped the downloading queue.
   *
   * You may still restart the queue after receiving this event.
   */
  error: unknown;
}

/** Payload for a `parsedInitSegment` event. */
export type IParsedInitSegmentPayload<T> = ISegmentParserParsedInitChunk<T> & {
  segment: ISegment;
};
/** Payload for a `parsedMediaSegment` event. */
export type IParsedSegmentPayload<T> = ISegmentParserParsedMediaChunk<T> & {
  segment: ISegment;
};
/** Payload for a `requestRetry` event. */
export interface IRequestRetryPayload {
  segment: ISegment;
  error: IPlayerError;
}

/**
 * Structure of the object that has to be emitted through the `SegmentQueue`
 * shared reference, to signal which segments are currently needed.
 */
export interface ISegmentQueueItem {
  /**
   * A potential initialization segment that needs to be loaded and parsed.
   * It will generally be requested in parralel of the first media segments.
   *
   * Can be set to `null` if you don't need to load the initialization segment
   * for now.
   *
   * If the `SegmentQueue`'s `hasInitSegment` constructor option has been
   * set to `true`, no media segment will be parsed before the initialization
   * segment has been loaded and parsed.
   */
  initSegment: IQueuedSegment | null;

  /**
   * The queue of media segments currently needed for download.
   *
   * Those will be loaded from the first element in that queue to the last
   * element in it.
   *
   * Note that any media segments in the segment queue will only be parsed once
   * either of these is true:
   *   - An initialization segment has been loaded and parsed by this
   *     `SegmentQueue` instance.
   *   - The `SegmentQueue`'s `hasInitSegment` constructor option has been
   *     set to `false`.
   */
  segmentQueue: IQueuedSegment[];
}

/** Object describing a pending Segment request. */
interface ISegmentRequestObject {
  /** The segment the request is for. */
  segment: ISegment;
  /** The request itself. Can be used to update its priority. */
  request: Promise<void>;
  /** Last set priority of the segment request (lower number = higher priority). */
  priority: number;
  /** Allows to cancel that segment from being requested. */
  canceller: TaskCanceller;
}

/** Context for segments downloaded through the SegmentQueue. */
export interface ISegmentQueueContext {
  /** Adaptation linked to the segments you want to load. */
  adaptation: IAdaptation;
  /** Manifest linked to the segments you want to load. */
  manifest: IManifest;
  /** Period linked to the segments you want to load. */
  period: IPeriod;
  /** Representation linked to the segments you want to load. */
  representation: IRepresentation;
}

interface ISegmentQueueContentInfo {
  /** Context of the Representation that will be loaded through this SegmentQueue. */
  content: ISegmentQueueContext;
  /**
   * Current queue of segments scheduled for download.
   *
   * Segments whose request are still pending are still in that queue. Segments
   * are only removed from it once their request has succeeded.
   */
  downloadQueue: SharedReference<ISegmentQueueItem>;
  /**
   * Allows to stop listening to queue updates and stop performing requests.
   * Set to `null` if the SegmentQueue is not started right now.
   */
  currentCanceller: TaskCanceller;
  /**
   * Pending request for the initialization segment.
   * `null` if no request is pending for it.
   */
  initSegmentRequest: ISegmentRequestObject | null;
  /**
   * Pending request for a media (i.e. non-initialization) segment.
   * `null` if no request is pending for it.
   */
  mediaSegmentRequest: ISegmentRequestObject | null;
  /**
   * Emit the timescale anounced in the initialization segment once parsed.
   * Emit `undefined` when this is not yet known.
   * Emit `null` when no initialization segment or timescale exists.
   */
  initSegmentInfoRef: SharedReference<number | undefined | null>;

  /**
   * Some media segment might have been loaded and are only awaiting for the
   * initialization segment to be parsed before being parsed themselves.
   * This string will contain the `id` property of that segment if one exist or
   * `null` if no segment is awaiting an init segment.
   */
  mediaSegmentAwaitingInitMetadata: string | null;
  /**
   * Indicates whether the user agent believes it has enough buffered data to ensure
   * uninterrupted playback for a meaningful period or needs more data.
   * It also reflects whether the user agent can retrieve and buffer data in an
   * energy-efficient manner while maintaining the desired memory usage.
   * The value can be `undefined` if the user agent does not provide this indicator.
   * `true` indicates that the buffer is low, and more data should be buffered.
   * `false` indicates that there is enough buffered data, and no additional data needs
   *  to be buffered at this time.
   */
  canStream: SharedReference<boolean | undefined>;
}
