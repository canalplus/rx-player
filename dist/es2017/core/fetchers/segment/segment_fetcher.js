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
import { formatError } from "../../../errors";
import log from "../../../log";
import { getLoggableSegmentId } from "../../../manifest";
import arrayIncludes from "../../../utils/array_includes";
import idGenerator from "../../../utils/id_generator";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import getTimestamp from "../../../utils/monotonic_timestamp";
import objectAssign from "../../../utils/object_assign";
import { CancellationError } from "../../../utils/task_canceller";
import errorSelector from "../utils/error_selector";
import { scheduleRequestWithCdns } from "../utils/schedule_request";
import InitializationSegmentCache from "./initialization_segment_cache";
/** Allows to generate a unique identifies for each request. */
const generateRequestID = idGenerator();
/**
 * Create an `ISegmentFetcher` object which will allow to easily fetch and parse
 * segments.
 * An `ISegmentFetcher` also implements a retry mechanism, based on the given
 * `requestOptions` argument, which may retry a segment request when it fails.
 *
 * @param {Object} args
 * @returns {Function}
 */
export default function createSegmentFetcher({ bufferType, pipeline, cdnPrioritizer, cmcdDataBuilder, eventListeners, requestOptions, }) {
    let connectionTimeout;
    if (requestOptions.connectionTimeout === undefined ||
        requestOptions.connectionTimeout < 0) {
        connectionTimeout = undefined;
    }
    else {
        connectionTimeout = requestOptions.connectionTimeout;
    }
    const pipelineRequestOptions = {
        timeout: requestOptions.requestTimeout < 0 ? undefined : requestOptions.requestTimeout,
        connectionTimeout,
        cmcdPayload: undefined,
    };
    /**
     * Cache audio and video initialization segments.
     * This allows to avoid doing too many requests for what are usually very
     * small files.
     */
    const cache = arrayIncludes(["audio", "video"], bufferType)
        ? new InitializationSegmentCache()
        : undefined;
    const { loadSegment, parseSegment } = pipeline;
    /**
     * Fetch a specific segment.
     * @param {Object} content
     * @param {Object} fetcherCallbacks
     * @param {Object} cancellationSignal
     * @returns {Promise}
     */
    return async function fetchSegment(content, fetcherCallbacks, cancellationSignal) {
        var _a, _b, _c;
        const { segment, adaptation, representation, manifest, period } = content;
        // used by logs
        const segmentIdString = getLoggableSegmentId(content);
        const requestId = generateRequestID();
        /**
         * If the request succeeded, set to the corresponding
         * `IChunkCompleteInformation` object.
         * For any other completion cases: if the request either failed, was
         * cancelled or just if no request was needed, set to `null`.
         *
         * Stays to `undefined` when the request is still pending.
         */
        let requestInfo;
        /**
         * Array containing one entry per loaded chunk, in chronological order.
         * The boolean indicates if the chunk has been parsed at least once.
         *
         * This is used to know when all loaded chunks have been parsed, which
         * can be useful to e.g. construct metrics about the loaded segment.
         */
        const parsedChunks = [];
        /**
         * Addition of the duration of each encountered and parsed chunks.
         * Allows to have an idea of the real duration of the full segment once
         * all chunks have been parsed.
         *
         * `undefined` if at least one of the parsed chunks has unknown duration.
         */
        let segmentDurationAcc = 0;
        /** Set to `true` once network metrics have been sent. */
        let metricsSent = false;
        /** Segment context given to the transport pipelines. */
        const context = {
            segment,
            type: adaptation.type,
            language: adaptation.language,
            isLive: manifest.isLive,
            periodStart: period.start,
            periodEnd: period.end,
            mimeType: representation.mimeType,
            codecs: representation.codecs[0],
            manifestPublishTime: manifest.publishTime,
        };
        const loaderCallbacks = {
            /**
             * Callback called when the segment loader has progress information on
             * the request.
             * @param {Object} info
             */
            onProgress(info) {
                var _a;
                if (requestInfo !== undefined) {
                    return; // request already termminated
                }
                if (info.totalSize !== undefined && info.size < info.totalSize) {
                    (_a = eventListeners.onProgress) === null || _a === void 0 ? void 0 : _a.call(eventListeners, {
                        duration: info.duration,
                        size: info.size,
                        totalSize: info.totalSize,
                        timestamp: getTimestamp(),
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
            onNewChunk(chunkData) {
                fetcherCallbacks.onChunk(generateParserFunction(chunkData, true));
            },
        };
        // Retrieve from cache if it exists
        const cached = cache !== undefined ? cache.get(content) : null;
        if (cached !== null) {
            log.debug("SF: Found wanted segment in cache", segmentIdString);
            fetcherCallbacks.onChunk(generateParserFunction(cached, false));
            return Promise.resolve();
        }
        log.debug("SF: Beginning request", segmentIdString);
        (_a = eventListeners.onRequestBegin) === null || _a === void 0 ? void 0 : _a.call(eventListeners, {
            requestTimestamp: getTimestamp(),
            id: requestId,
            content,
        });
        cancellationSignal.register(onCancellation);
        try {
            const res = await scheduleRequestWithCdns(content.representation.cdnMetadata, cdnPrioritizer, callLoaderWithUrl, objectAssign({ onRetry }, requestOptions), cancellationSignal);
            if (res.resultType === "segment-loaded") {
                const loadedData = res.resultData.responseData;
                if (cache !== undefined) {
                    cache.add(content, res.resultData.responseData);
                }
                fetcherCallbacks.onChunk(generateParserFunction(loadedData, false));
            }
            else if (res.resultType === "segment-created") {
                fetcherCallbacks.onChunk(generateParserFunction(res.resultData, false));
            }
            log.debug("SF: Segment request ended with success", segmentIdString);
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
                (_b = eventListeners.onRequestEnd) === null || _b === void 0 ? void 0 : _b.call(eventListeners, { id: requestId });
            }
            cancellationSignal.deregister(onCancellation);
        }
        catch (err) {
            cancellationSignal.deregister(onCancellation);
            requestInfo = null;
            if (err instanceof CancellationError) {
                log.debug("SF: Segment request aborted", segmentIdString);
                throw err;
            }
            log.debug("SF: Segment request failed", segmentIdString);
            (_c = eventListeners.onRequestEnd) === null || _c === void 0 ? void 0 : _c.call(eventListeners, { id: requestId });
            throw errorSelector(err);
        }
        function onCancellation() {
            var _a;
            if (requestInfo !== undefined) {
                return; // Request already terminated
            }
            log.debug("SF: Segment request cancelled", segmentIdString);
            requestInfo = null;
            (_a = eventListeners.onRequestEnd) === null || _a === void 0 ? void 0 : _a.call(eventListeners, { id: requestId });
        }
        /**
         * Call a segment loader for the given URL with the right arguments.
         * @param {Object|null} cdnMetadata
         * @returns {Promise}
         */
        function callLoaderWithUrl(cdnMetadata) {
            pipelineRequestOptions.cmcdPayload =
                cmcdDataBuilder === null || cmcdDataBuilder === void 0 ? void 0 : cmcdDataBuilder.getCmcdDataForSegmentRequest(content);
            return loadSegment(cdnMetadata, context, pipelineRequestOptions, cancellationSignal, loaderCallbacks);
        }
        /**
         * Generate function allowing to parse a loaded segment.
         * @param {*} data
         * @param {Boolean} isChunked
         * @returns {Function}
         */
        function generateParserFunction(data, isChunked) {
            parsedChunks.push(false);
            const parsedChunkId = parsedChunks.length - 1;
            return function parse(initTimescale) {
                const loaded = { data, isChunked };
                try {
                    const parsed = parseSegment(loaded, context, initTimescale);
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
                    throw formatError(error, {
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
            fetcherCallbacks.onRetry(errorSelector(err));
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
            if (!isNullOrUndefined(requestInfo) &&
                requestInfo.size !== undefined &&
                requestInfo.requestDuration !== undefined &&
                parsedChunks.length > 0 &&
                parsedChunks.every((isParsed) => isParsed)) {
                metricsSent = true;
                (_a = eventListeners.onMetrics) === null || _a === void 0 ? void 0 : _a.call(eventListeners, {
                    size: requestInfo.size,
                    requestDuration: requestInfo.requestDuration,
                    content,
                    segmentDuration: segmentDurationAcc,
                });
            }
        }
    };
}
/**
 * @param {Object} baseOptions
 * @returns {Object}
 */
export function getSegmentFetcherRequestOptions({ maxRetry, lowLatencyMode, requestTimeout, connectionTimeout, }) {
    const { DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR, DEFAULT_REQUEST_TIMEOUT, DEFAULT_CONNECTION_TIMEOUT, INITIAL_BACKOFF_DELAY_BASE, MAX_BACKOFF_DELAY_BASE, } = config.getCurrent();
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
