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
import assert from "../../../../utils/assert";
import EventEmitter from "../../../../utils/event_emitter";
import noop from "../../../../utils/noop";
import objectAssign from "../../../../utils/object_assign";
import SharedReference from "../../../../utils/reference";
import TaskCanceller from "../../../../utils/task_canceller";
/**
 * Class scheduling segment downloads for a single Representation.
 *
 * TODO The request scheduling abstractions might be simplified by integrating
 * the `DownloadingQueue` in the segment fetchers code, instead of having it as
 * an utilis of the `RepresentationStream` like here.
 * @class DownloadingQueue
 */
export default class DownloadingQueue extends EventEmitter {
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
    constructor(content, downloadQueue, segmentFetcher, hasInitSegment) {
        super();
        this._content = content;
        this._currentCanceller = null;
        this._downloadQueue = downloadQueue;
        this._initSegmentRequest = null;
        this._mediaSegmentRequest = null;
        this._segmentFetcher = segmentFetcher;
        this._initSegmentInfoRef = new SharedReference(undefined);
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
    getRequestedInitSegment() {
        return this._initSegmentRequest === null ? null : this._initSegmentRequest.segment;
    }
    /**
     * Returns the media segment currently being requested.
     * Returns `null` if no media segment request is pending.
     * @returns {Object | null}
     */
    getRequestedMediaSegment() {
        return this._mediaSegmentRequest === null ? null : this._mediaSegmentRequest.segment;
    }
    /**
     * Start the current downloading queue, emitting events as it loads and parses
     * initialization and media segments.
     */
    start() {
        if (this._currentCanceller !== null) {
            return;
        }
        this._currentCanceller = new TaskCanceller();
        // Listen for asked media segments
        this._downloadQueue.onUpdate((queue) => {
            const { segmentQueue } = queue;
            if (segmentQueue.length > 0 &&
                segmentQueue[0].segment.id === this._mediaSegmentAwaitingInitMetadata) {
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
                log.debug("Stream: no more media segment to request. Cancelling queue.", this._content.adaptation.type);
                this._restartMediaSegmentDownloadingQueue();
                return;
            }
            else if (currentSegmentRequest === null) {
                // There's no request although there are needed segments: start requests
                log.debug("Stream: Media segments now need to be requested. Starting queue.", this._content.adaptation.type, segmentQueue.length);
                this._restartMediaSegmentDownloadingQueue();
                return;
            }
            else {
                const nextItem = segmentQueue[0];
                if (currentSegmentRequest.segment.id !== nextItem.segment.id) {
                    // The most important request if for another segment, request it
                    log.debug("Stream: Next media segment changed, cancelling previous", this._content.adaptation.type);
                    this._restartMediaSegmentDownloadingQueue();
                    return;
                }
                if (currentSegmentRequest.priority !== nextItem.priority) {
                    // The priority of the most important request has changed, update it
                    log.debug("Stream: Priority of next media segment changed, updating", this._content.adaptation.type, currentSegmentRequest.priority, nextItem.priority);
                    this._segmentFetcher.updatePriority(currentSegmentRequest.request, nextItem.priority);
                }
                return;
            }
        }, { emitCurrentValue: true, clearSignal: this._currentCanceller.signal });
        // Listen for asked init segment
        this._downloadQueue.onUpdate((next) => {
            var _a;
            const initSegmentRequest = this._initSegmentRequest;
            if (next.initSegment !== null && initSegmentRequest !== null) {
                if (next.initSegment.priority !== initSegmentRequest.priority) {
                    this._segmentFetcher.updatePriority(initSegmentRequest.request, next.initSegment.priority);
                }
                return;
            }
            else if (((_a = next.initSegment) === null || _a === void 0 ? void 0 : _a.segment.id) === (initSegmentRequest === null || initSegmentRequest === void 0 ? void 0 : initSegmentRequest.segment.id)) {
                return;
            }
            if (next.initSegment === null) {
                log.debug("Stream: no more init segment to request. Cancelling queue.", this._content.adaptation.type);
            }
            this._restartInitSegmentDownloadingQueue(next.initSegment);
        }, { emitCurrentValue: true, clearSignal: this._currentCanceller.signal });
    }
    stop() {
        var _a;
        (_a = this._currentCanceller) === null || _a === void 0 ? void 0 : _a.cancel();
        this._currentCanceller = null;
    }
    /**
     * Internal logic performing media segment requests.
     */
    _restartMediaSegmentDownloadingQueue() {
        if (this._mediaSegmentRequest !== null) {
            this._mediaSegmentRequest.canceller.cancel();
        }
        const { segmentQueue } = this._downloadQueue.getValue();
        const currentNeededSegment = segmentQueue[0];
        const recursivelyRequestSegments = (startingSegment) => {
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
            const unlinkCanceller = this._currentCanceller === null
                ? noop
                : canceller.linkToSignal(this._currentCanceller.signal);
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
            const emitChunk = (parsed) => {
                assert(parsed.segmentType === "media", "Should have loaded a media segment.");
                this.trigger("parsedMediaSegment", objectAssign({}, parsed, { segment }));
            };
            const continueToNextSegment = () => {
                const lastQueue = this._downloadQueue.getValue().segmentQueue;
                if (lastQueue.length === 0) {
                    isComplete = true;
                    this.trigger("emptyQueue", null);
                    return;
                }
                else if (lastQueue[0].segment.id === segment.id) {
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
                onRetry: (error) => {
                    this.trigger("requestRetry", { segment, error });
                },
                /**
                 * Callback called when the request has to be interrupted and
                 * restarted later.
                 */
                beforeInterrupted() {
                    log.info("Stream: segment request interrupted temporarly.", segment.id, segment.time);
                },
                /**
                 * Callback called when a decodable chunk of the segment is available.
                 * @param {Function} parse - Function allowing to parse the segment.
                 */
                onChunk: (parse) => {
                    const initTimescale = this._initSegmentInfoRef.getValue();
                    if (initTimescale !== undefined) {
                        emitChunk(parse(initTimescale !== null && initTimescale !== void 0 ? initTimescale : undefined));
                    }
                    else {
                        isWaitingOnInitSegment = true;
                        // We could also technically call `waitUntilDefined` in both cases,
                        // but I found it globally clearer to segregate the two cases,
                        // especially to always have a meaningful `isWaitingOnInitSegment`
                        // boolean which is a very important variable.
                        this._initSegmentInfoRef.waitUntilDefined((actualTimescale) => {
                            emitChunk(parse(actualTimescale !== null && actualTimescale !== void 0 ? actualTimescale : undefined));
                        }, { clearSignal: canceller.signal });
                    }
                },
                /** Callback called after all chunks have been sent. */
                onAllChunksReceived: () => {
                    if (!isWaitingOnInitSegment) {
                        this.trigger("fullyLoadedSegment", segment);
                    }
                    else {
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
                beforeEnded: () => {
                    unlinkCanceller();
                    this._mediaSegmentRequest = null;
                    if (isWaitingOnInitSegment) {
                        this._initSegmentInfoRef.waitUntilDefined(continueToNextSegment, {
                            clearSignal: canceller.signal,
                        });
                    }
                    else {
                        continueToNextSegment();
                    }
                },
            }, canceller.signal);
            request.catch((error) => {
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
    _restartInitSegmentDownloadingQueue(queuedInitSegment) {
        if (this._currentCanceller !== null && this._currentCanceller.isUsed()) {
            return;
        }
        if (this._initSegmentRequest !== null) {
            this._initSegmentRequest.canceller.cancel();
        }
        if (queuedInitSegment === null) {
            return;
        }
        const canceller = new TaskCanceller();
        const unlinkCanceller = this._currentCanceller === null
            ? noop
            : canceller.linkToSignal(this._currentCanceller.signal);
        const { segment, priority } = queuedInitSegment;
        const context = objectAssign({ segment }, this._content);
        /**
         * If `true` , the current task has either errored, finished, or was
         * cancelled.
         */
        let isComplete = false;
        const request = this._segmentFetcher.createRequest(context, priority, {
            onRetry: (err) => {
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
            onChunk: (parse) => {
                var _a;
                const parsed = parse(undefined);
                assert(parsed.segmentType === "init", "Should have loaded an init segment.");
                this.trigger("parsedInitSegment", objectAssign({}, parsed, { segment }));
                if (parsed.segmentType === "init") {
                    this._initSegmentInfoRef.setValue((_a = parsed.initTimescale) !== null && _a !== void 0 ? _a : null);
                }
            },
            onAllChunksReceived: () => {
                this.trigger("fullyLoadedSegment", segment);
            },
        }, canceller.signal);
        request.catch((error) => {
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
