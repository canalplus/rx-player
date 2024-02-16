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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSegmentFetcherOptions = void 0;
var config_1 = require("../../../config");
var errors_1 = require("../../../errors");
var log_1 = require("../../../log");
var manifest_1 = require("../../../manifest");
var array_includes_1 = require("../../../utils/array_includes");
var id_generator_1 = require("../../../utils/id_generator");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
var object_assign_1 = require("../../../utils/object_assign");
var task_canceller_1 = require("../../../utils/task_canceller");
var error_selector_1 = require("../utils/error_selector");
var schedule_request_1 = require("../utils/schedule_request");
var initialization_segment_cache_1 = require("./initialization_segment_cache");
/** Allows to generate a unique identifies for each request. */
var generateRequestID = (0, id_generator_1.default)();
/**
 * Create an `ISegmentFetcher` object which will allow to easily fetch and parse
 * segments.
 * An `ISegmentFetcher` also implements a retry mechanism, based on the given
 * `options` argument, which may retry a segment request when it fails.
 *
 * @param {string} bufferType - Type of  buffer concerned (e.g. `"audio"`,
 * `"video"`, `"text" etc.)
 * @param {Object} pipeline - The transport-specific logic allowing to load
 * segments of the given buffer type and transport protocol (e.g. DASH).
 * @param {Object|null} cdnPrioritizer - Abstraction allowing to synchronize,
 * update and keep track of the priorization of the CDN to use to load any given
 * segment, in cases where multiple ones are available.
 *
 * Can be set to `null` in which case a minimal priorization logic will be used
 * instead.
 * @param {Object} lifecycleCallbacks - Callbacks that can be registered to be
 * informed when new requests are made, ended, new metrics are available etc.
 * This should be mainly useful to implement an adaptive logic relying on those
 * metrics and events.
 * @param {Object} options - Various tweaking options allowing to configure the
 * behavior of the returned `ISegmentFetcher`.
 * @returns {Function}
 */
function createSegmentFetcher(bufferType, pipeline, cdnPrioritizer, lifecycleCallbacks, options) {
    var connectionTimeout;
    if (options.connectionTimeout === undefined || options.connectionTimeout < 0) {
        connectionTimeout = undefined;
    }
    else {
        connectionTimeout = options.connectionTimeout;
    }
    var requestOptions = {
        timeout: options.requestTimeout < 0 ? undefined : options.requestTimeout,
        connectionTimeout: connectionTimeout,
    };
    /**
     * Cache audio and video initialization segments.
     * This allows to avoid doing too many requests for what are usually very
     * small files.
     */
    var cache = (0, array_includes_1.default)(["audio", "video"], bufferType)
        ? new initialization_segment_cache_1.default()
        : undefined;
    var loadSegment = pipeline.loadSegment, parseSegment = pipeline.parseSegment;
    /**
     * Fetch a specific segment.
     * @param {Object} content
     * @param {Object} fetcherCallbacks
     * @param {Object} cancellationSignal
     * @returns {Promise}
     */
    return function fetchSegment(content, fetcherCallbacks, cancellationSignal) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            function onCancellation() {
                var _a;
                if (requestInfo !== undefined) {
                    return; // Request already terminated
                }
                log_1.default.debug("SF: Segment request cancelled", segmentIdString);
                requestInfo = null;
                (_a = lifecycleCallbacks.onRequestEnd) === null || _a === void 0 ? void 0 : _a.call(lifecycleCallbacks, { id: requestId });
            }
            /**
             * Call a segment loader for the given URL with the right arguments.
             * @param {Object|null} cdnMetadata
             * @returns {Promise}
             */
            function callLoaderWithUrl(cdnMetadata) {
                return loadSegment(cdnMetadata, context, requestOptions, cancellationSignal, loaderCallbacks);
            }
            /**
             * Generate function allowing to parse a loaded segment.
             * @param {*} data
             * @param {Boolean} isChunked
             * @returns {Function}
             */
            function generateParserFunction(data, isChunked) {
                parsedChunks.push(false);
                var parsedChunkId = parsedChunks.length - 1;
                return function parse(initTimescale) {
                    var loaded = { data: data, isChunked: isChunked };
                    try {
                        var parsed = parseSegment(loaded, context, initTimescale);
                        if (!parsedChunks[parsedChunkId]) {
                            segmentDurationAcc =
                                segmentDurationAcc !== undefined &&
                                    parsed.segmentType === "media" &&
                                    parsed.chunkInfos !== null &&
                                    parsed.chunkInfos.duration !== undefined
                                    ? segmentDurationAcc + parsed.chunkInfos.duration
                                    : undefined;
                            parsedChunks[parsedChunkId] = true;
                            sendNetworkMetricsIfAvailable();
                        }
                        return parsed;
                    }
                    catch (error) {
                        throw (0, errors_1.formatError)(error, {
                            defaultCode: "PIPELINE_PARSE_ERROR",
                            defaultReason: "Unknown parsing error",
                        });
                    }
                };
            }
            /**
             * Function called when the function request is retried.
             * @param {*} err
             */
            function onRetry(err) {
                fetcherCallbacks.onRetry((0, error_selector_1.default)(err));
            }
            /**
             * Send netork metrics if they haven't yet been sent and if all data to
             * define them is available.
             */
            function sendNetworkMetricsIfAvailable() {
                var _a;
                if (metricsSent) {
                    return;
                }
                if (!(0, is_null_or_undefined_1.default)(requestInfo) &&
                    requestInfo.size !== undefined &&
                    requestInfo.requestDuration !== undefined &&
                    parsedChunks.length > 0 &&
                    parsedChunks.every(function (isParsed) { return isParsed; })) {
                    metricsSent = true;
                    (_a = lifecycleCallbacks.onMetrics) === null || _a === void 0 ? void 0 : _a.call(lifecycleCallbacks, {
                        size: requestInfo.size,
                        requestDuration: requestInfo.requestDuration,
                        content: content,
                        segmentDuration: segmentDurationAcc,
                    });
                }
            }
            var segment, adaptation, representation, manifest, period, segmentIdString, requestId, requestInfo, parsedChunks, segmentDurationAcc, metricsSent, context, loaderCallbacks, cached, res, loadedData, err_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        segment = content.segment, adaptation = content.adaptation, representation = content.representation, manifest = content.manifest, period = content.period;
                        segmentIdString = (0, manifest_1.getLoggableSegmentId)(content);
                        requestId = generateRequestID();
                        parsedChunks = [];
                        segmentDurationAcc = 0;
                        metricsSent = false;
                        context = {
                            segment: segment,
                            type: adaptation.type,
                            language: adaptation.language,
                            isLive: manifest.isLive,
                            periodStart: period.start,
                            periodEnd: period.end,
                            mimeType: representation.mimeType,
                            codecs: representation.codecs[0],
                            manifestPublishTime: manifest.publishTime,
                        };
                        loaderCallbacks = {
                            /**
                             * Callback called when the segment loader has progress information on
                             * the request.
                             * @param {Object} info
                             */
                            onProgress: function (info) {
                                var _a;
                                if (requestInfo !== undefined) {
                                    return; // request already termminated
                                }
                                if (info.totalSize !== undefined && info.size < info.totalSize) {
                                    (_a = lifecycleCallbacks.onProgress) === null || _a === void 0 ? void 0 : _a.call(lifecycleCallbacks, {
                                        duration: info.duration,
                                        size: info.size,
                                        totalSize: info.totalSize,
                                        timestamp: (0, monotonic_timestamp_1.default)(),
                                        id: requestId,
                                    });
                                }
                            },
                            /**
                             * Callback called when the segment is communicated by the loader
                             * through decodable sub-segment(s) called chunk(s), with a chunk in
                             * argument.
                             * @param {*} chunkData
                             */
                            onNewChunk: function (chunkData) {
                                fetcherCallbacks.onChunk(generateParserFunction(chunkData, true));
                            },
                        };
                        cached = cache !== undefined ? cache.get(content) : null;
                        if (cached !== null) {
                            log_1.default.debug("SF: Found wanted segment in cache", segmentIdString);
                            fetcherCallbacks.onChunk(generateParserFunction(cached, false));
                            return [2 /*return*/, Promise.resolve()];
                        }
                        log_1.default.debug("SF: Beginning request", segmentIdString);
                        (_a = lifecycleCallbacks.onRequestBegin) === null || _a === void 0 ? void 0 : _a.call(lifecycleCallbacks, {
                            requestTimestamp: (0, monotonic_timestamp_1.default)(),
                            id: requestId,
                            content: content,
                        });
                        cancellationSignal.register(onCancellation);
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, schedule_request_1.scheduleRequestWithCdns)(content.representation.cdnMetadata, cdnPrioritizer, callLoaderWithUrl, (0, object_assign_1.default)({ onRetry: onRetry }, options), cancellationSignal)];
                    case 2:
                        res = _d.sent();
                        if (res.resultType === "segment-loaded") {
                            loadedData = res.resultData.responseData;
                            if (cache !== undefined) {
                                cache.add(content, res.resultData.responseData);
                            }
                            fetcherCallbacks.onChunk(generateParserFunction(loadedData, false));
                        }
                        else if (res.resultType === "segment-created") {
                            fetcherCallbacks.onChunk(generateParserFunction(res.resultData, false));
                        }
                        log_1.default.debug("SF: Segment request ended with success", segmentIdString);
                        fetcherCallbacks.onAllChunksReceived();
                        if (res.resultType !== "segment-created") {
                            requestInfo = res.resultData;
                            sendNetworkMetricsIfAvailable();
                        }
                        else {
                            requestInfo = null;
                        }
                        if (!cancellationSignal.isCancelled()) {
                            // The current task could have been canceled as a result of one
                            // of the previous callbacks call. In that case, we don't want to send
                            // a "requestEnd" again as it has already been sent on cancellation.
                            (_b = lifecycleCallbacks.onRequestEnd) === null || _b === void 0 ? void 0 : _b.call(lifecycleCallbacks, { id: requestId });
                        }
                        cancellationSignal.deregister(onCancellation);
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _d.sent();
                        cancellationSignal.deregister(onCancellation);
                        requestInfo = null;
                        if (err_1 instanceof task_canceller_1.CancellationError) {
                            log_1.default.debug("SF: Segment request aborted", segmentIdString);
                            throw err_1;
                        }
                        log_1.default.debug("SF: Segment request failed", segmentIdString);
                        (_c = lifecycleCallbacks.onRequestEnd) === null || _c === void 0 ? void 0 : _c.call(lifecycleCallbacks, { id: requestId });
                        throw (0, error_selector_1.default)(err_1);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
}
exports.default = createSegmentFetcher;
/**
 * @param {string} bufferType
 * @param {Object}
 * @returns {Object}
 */
function getSegmentFetcherOptions(_a) {
    var maxRetry = _a.maxRetry, lowLatencyMode = _a.lowLatencyMode, requestTimeout = _a.requestTimeout, connectionTimeout = _a.connectionTimeout;
    var _b = config_1.default.getCurrent(), DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR = _b.DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR, DEFAULT_REQUEST_TIMEOUT = _b.DEFAULT_REQUEST_TIMEOUT, DEFAULT_CONNECTION_TIMEOUT = _b.DEFAULT_CONNECTION_TIMEOUT, INITIAL_BACKOFF_DELAY_BASE = _b.INITIAL_BACKOFF_DELAY_BASE, MAX_BACKOFF_DELAY_BASE = _b.MAX_BACKOFF_DELAY_BASE;
    return {
        maxRetry: maxRetry !== null && maxRetry !== void 0 ? maxRetry : DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR,
        baseDelay: lowLatencyMode
            ? INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY
            : INITIAL_BACKOFF_DELAY_BASE.REGULAR,
        maxDelay: lowLatencyMode
            ? MAX_BACKOFF_DELAY_BASE.LOW_LATENCY
            : MAX_BACKOFF_DELAY_BASE.REGULAR,
        requestTimeout: requestTimeout === undefined ? DEFAULT_REQUEST_TIMEOUT : requestTimeout,
        connectionTimeout: connectionTimeout === undefined ? DEFAULT_CONNECTION_TIMEOUT : connectionTimeout,
    };
}
exports.getSegmentFetcherOptions = getSegmentFetcherOptions;
