"use strict";
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../../../log");
var assert_1 = require("../../../../utils/assert");
var event_emitter_1 = require("../../../../utils/event_emitter");
var noop_1 = require("../../../../utils/noop");
var object_assign_1 = require("../../../../utils/object_assign");
var reference_1 = require("../../../../utils/reference");
var task_canceller_1 = require("../../../../utils/task_canceller");
/**
 * Class scheduling segment downloads for a single Representation.
 *
 * TODO The request scheduling abstractions might be simplified by integrating
 * the `DownloadingQueue` in the segment fetchers code, instead of having it as
 * an utilis of the `RepresentationStream` like here.
 * @class DownloadingQueue
 */
var DownloadingQueue = /** @class */ (function (_super) {
    __extends(DownloadingQueue, _super);
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
    function DownloadingQueue(content, downloadQueue, segmentFetcher, hasInitSegment) {
        var _this = _super.call(this) || this;
        _this._content = content;
        _this._currentCanceller = null;
        _this._downloadQueue = downloadQueue;
        _this._initSegmentRequest = null;
        _this._mediaSegmentRequest = null;
        _this._segmentFetcher = segmentFetcher;
        _this._initSegmentInfoRef = new reference_1.default(undefined);
        _this._mediaSegmentAwaitingInitMetadata = null;
        if (!hasInitSegment) {
            _this._initSegmentInfoRef.setValue(null);
        }
        return _this;
    }
    /**
     * Returns the initialization segment currently being requested.
     * Returns `null` if no initialization segment request is pending.
     * @returns {Object | null}
     */
    DownloadingQueue.prototype.getRequestedInitSegment = function () {
        return this._initSegmentRequest === null ? null : this._initSegmentRequest.segment;
    };
    /**
     * Returns the media segment currently being requested.
     * Returns `null` if no media segment request is pending.
     * @returns {Object | null}
     */
    DownloadingQueue.prototype.getRequestedMediaSegment = function () {
        return this._mediaSegmentRequest === null ? null : this._mediaSegmentRequest.segment;
    };
    /**
     * Start the current downloading queue, emitting events as it loads and parses
     * initialization and media segments.
     */
    DownloadingQueue.prototype.start = function () {
        var _this = this;
        if (this._currentCanceller !== null) {
            return;
        }
        this._currentCanceller = new task_canceller_1.default();
        // Listen for asked media segments
        this._downloadQueue.onUpdate(function (queue) {
            var segmentQueue = queue.segmentQueue;
            if (segmentQueue.length > 0 &&
                segmentQueue[0].segment.id === _this._mediaSegmentAwaitingInitMetadata) {
                // The most needed segment is still the same one, and there's no need to
                // update its priority as the request already ended, just quit.
                return;
            }
            var currentSegmentRequest = _this._mediaSegmentRequest;
            if (segmentQueue.length === 0) {
                if (currentSegmentRequest === null) {
                    // There's nothing to load but there's already no request pending.
                    return;
                }
                log_1.default.debug("Stream: no more media segment to request. Cancelling queue.", _this._content.adaptation.type);
                _this._restartMediaSegmentDownloadingQueue();
                return;
            }
            else if (currentSegmentRequest === null) {
                // There's no request although there are needed segments: start requests
                log_1.default.debug("Stream: Media segments now need to be requested. Starting queue.", _this._content.adaptation.type, segmentQueue.length);
                _this._restartMediaSegmentDownloadingQueue();
                return;
            }
            else {
                var nextItem = segmentQueue[0];
                if (currentSegmentRequest.segment.id !== nextItem.segment.id) {
                    // The most important request if for another segment, request it
                    log_1.default.debug("Stream: Next media segment changed, cancelling previous", _this._content.adaptation.type);
                    _this._restartMediaSegmentDownloadingQueue();
                    return;
                }
                if (currentSegmentRequest.priority !== nextItem.priority) {
                    // The priority of the most important request has changed, update it
                    log_1.default.debug("Stream: Priority of next media segment changed, updating", _this._content.adaptation.type, currentSegmentRequest.priority, nextItem.priority);
                    _this._segmentFetcher.updatePriority(currentSegmentRequest.request, nextItem.priority);
                }
                return;
            }
        }, { emitCurrentValue: true, clearSignal: this._currentCanceller.signal });
        // Listen for asked init segment
        this._downloadQueue.onUpdate(function (next) {
            var _a;
            var initSegmentRequest = _this._initSegmentRequest;
            if (next.initSegment !== null && initSegmentRequest !== null) {
                if (next.initSegment.priority !== initSegmentRequest.priority) {
                    _this._segmentFetcher.updatePriority(initSegmentRequest.request, next.initSegment.priority);
                }
                return;
            }
            else if (((_a = next.initSegment) === null || _a === void 0 ? void 0 : _a.segment.id) === (initSegmentRequest === null || initSegmentRequest === void 0 ? void 0 : initSegmentRequest.segment.id)) {
                return;
            }
            if (next.initSegment === null) {
                log_1.default.debug("Stream: no more init segment to request. Cancelling queue.", _this._content.adaptation.type);
            }
            _this._restartInitSegmentDownloadingQueue(next.initSegment);
        }, { emitCurrentValue: true, clearSignal: this._currentCanceller.signal });
    };
    DownloadingQueue.prototype.stop = function () {
        var _a;
        (_a = this._currentCanceller) === null || _a === void 0 ? void 0 : _a.cancel();
        this._currentCanceller = null;
    };
    /**
     * Internal logic performing media segment requests.
     */
    DownloadingQueue.prototype._restartMediaSegmentDownloadingQueue = function () {
        var _this = this;
        if (this._mediaSegmentRequest !== null) {
            this._mediaSegmentRequest.canceller.cancel();
        }
        var segmentQueue = this._downloadQueue.getValue().segmentQueue;
        var currentNeededSegment = segmentQueue[0];
        var recursivelyRequestSegments = function (startingSegment) {
            if (_this._currentCanceller !== null && _this._currentCanceller.isUsed()) {
                _this._mediaSegmentRequest = null;
                return;
            }
            if (startingSegment === undefined) {
                _this._mediaSegmentRequest = null;
                _this.trigger("emptyQueue", null);
                return;
            }
            var canceller = new task_canceller_1.default();
            var unlinkCanceller = _this._currentCanceller === null
                ? noop_1.default
                : canceller.linkToSignal(_this._currentCanceller.signal);
            var segment = startingSegment.segment, priority = startingSegment.priority;
            var context = (0, object_assign_1.default)({ segment: segment }, _this._content);
            /**
             * If `true` , the current task has either errored, finished, or was
             * cancelled.
             */
            var isComplete = false;
            /**
             * If true, we're currently waiting for the initialization segment to be
             * parsed before parsing a received chunk.
             */
            var isWaitingOnInitSegment = false;
            canceller.signal.register(function () {
                _this._mediaSegmentRequest = null;
                if (isComplete) {
                    return;
                }
                if (_this._mediaSegmentAwaitingInitMetadata === segment.id) {
                    _this._mediaSegmentAwaitingInitMetadata = null;
                }
                isComplete = true;
                isWaitingOnInitSegment = false;
            });
            var emitChunk = function (parsed) {
                (0, assert_1.default)(parsed.segmentType === "media", "Should have loaded a media segment.");
                _this.trigger("parsedMediaSegment", (0, object_assign_1.default)({}, parsed, { segment: segment }));
            };
            var continueToNextSegment = function () {
                var lastQueue = _this._downloadQueue.getValue().segmentQueue;
                if (lastQueue.length === 0) {
                    isComplete = true;
                    _this.trigger("emptyQueue", null);
                    return;
                }
                else if (lastQueue[0].segment.id === segment.id) {
                    lastQueue.shift();
                }
                isComplete = true;
                recursivelyRequestSegments(lastQueue[0]);
            };
            /** Scheduled actual segment request. */
            var request = _this._segmentFetcher.createRequest(context, priority, {
                /**
                 * Callback called when the request has to be retried.
                 * @param {Error} error
                 */
                onRetry: function (error) {
                    _this.trigger("requestRetry", { segment: segment, error: error });
                },
                /**
                 * Callback called when the request has to be interrupted and
                 * restarted later.
                 */
                beforeInterrupted: function () {
                    log_1.default.info("Stream: segment request interrupted temporarly.", segment.id, segment.time);
                },
                /**
                 * Callback called when a decodable chunk of the segment is available.
                 * @param {Function} parse - Function allowing to parse the segment.
                 */
                onChunk: function (parse) {
                    var initTimescale = _this._initSegmentInfoRef.getValue();
                    if (initTimescale !== undefined) {
                        emitChunk(parse(initTimescale !== null && initTimescale !== void 0 ? initTimescale : undefined));
                    }
                    else {
                        isWaitingOnInitSegment = true;
                        // We could also technically call `waitUntilDefined` in both cases,
                        // but I found it globally clearer to segregate the two cases,
                        // especially to always have a meaningful `isWaitingOnInitSegment`
                        // boolean which is a very important variable.
                        _this._initSegmentInfoRef.waitUntilDefined(function (actualTimescale) {
                            emitChunk(parse(actualTimescale !== null && actualTimescale !== void 0 ? actualTimescale : undefined));
                        }, { clearSignal: canceller.signal });
                    }
                },
                /** Callback called after all chunks have been sent. */
                onAllChunksReceived: function () {
                    if (!isWaitingOnInitSegment) {
                        _this.trigger("fullyLoadedSegment", segment);
                    }
                    else {
                        _this._mediaSegmentAwaitingInitMetadata = segment.id;
                        _this._initSegmentInfoRef.waitUntilDefined(function () {
                            _this._mediaSegmentAwaitingInitMetadata = null;
                            isWaitingOnInitSegment = false;
                            _this.trigger("fullyLoadedSegment", segment);
                        }, { clearSignal: canceller.signal });
                    }
                },
                /**
                 * Callback called right after the request ended but before the next
                 * requests are scheduled. It is used to schedule the next segment.
                 */
                beforeEnded: function () {
                    unlinkCanceller();
                    _this._mediaSegmentRequest = null;
                    if (isWaitingOnInitSegment) {
                        _this._initSegmentInfoRef.waitUntilDefined(continueToNextSegment, {
                            clearSignal: canceller.signal,
                        });
                    }
                    else {
                        continueToNextSegment();
                    }
                },
            }, canceller.signal);
            request.catch(function (error) {
                unlinkCanceller();
                if (!isComplete) {
                    isComplete = true;
                    _this.stop();
                    _this.trigger("error", error);
                }
            });
            _this._mediaSegmentRequest = { segment: segment, priority: priority, request: request, canceller: canceller };
        };
        recursivelyRequestSegments(currentNeededSegment);
    };
    /**
     * Internal logic performing initialization segment requests.
     * @param {Object} queuedInitSegment
     */
    DownloadingQueue.prototype._restartInitSegmentDownloadingQueue = function (queuedInitSegment) {
        var _this = this;
        if (this._currentCanceller !== null && this._currentCanceller.isUsed()) {
            return;
        }
        if (this._initSegmentRequest !== null) {
            this._initSegmentRequest.canceller.cancel();
        }
        if (queuedInitSegment === null) {
            return;
        }
        var canceller = new task_canceller_1.default();
        var unlinkCanceller = this._currentCanceller === null
            ? noop_1.default
            : canceller.linkToSignal(this._currentCanceller.signal);
        var segment = queuedInitSegment.segment, priority = queuedInitSegment.priority;
        var context = (0, object_assign_1.default)({ segment: segment }, this._content);
        /**
         * If `true` , the current task has either errored, finished, or was
         * cancelled.
         */
        var isComplete = false;
        var request = this._segmentFetcher.createRequest(context, priority, {
            onRetry: function (err) {
                _this.trigger("requestRetry", { segment: segment, error: err });
            },
            beforeInterrupted: function () {
                log_1.default.info("Stream: init segment request interrupted temporarly.", segment.id);
            },
            beforeEnded: function () {
                unlinkCanceller();
                _this._initSegmentRequest = null;
                isComplete = true;
            },
            onChunk: function (parse) {
                var _a;
                var parsed = parse(undefined);
                (0, assert_1.default)(parsed.segmentType === "init", "Should have loaded an init segment.");
                _this.trigger("parsedInitSegment", (0, object_assign_1.default)({}, parsed, { segment: segment }));
                if (parsed.segmentType === "init") {
                    _this._initSegmentInfoRef.setValue((_a = parsed.initTimescale) !== null && _a !== void 0 ? _a : null);
                }
            },
            onAllChunksReceived: function () {
                _this.trigger("fullyLoadedSegment", segment);
            },
        }, canceller.signal);
        request.catch(function (error) {
            unlinkCanceller();
            if (!isComplete) {
                isComplete = true;
                _this.stop();
                _this.trigger("error", error);
            }
        });
        canceller.signal.register(function () {
            _this._initSegmentRequest = null;
            if (isComplete) {
                return;
            }
            isComplete = true;
        });
        this._initSegmentRequest = { segment: segment, priority: priority, request: request, canceller: canceller };
    };
    return DownloadingQueue;
}(event_emitter_1.default));
exports.default = DownloadingQueue;
