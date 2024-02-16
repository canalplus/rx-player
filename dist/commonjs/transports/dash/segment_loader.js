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
Object.defineProperty(exports, "__esModule", { value: true });
exports.regularSegmentLoader = void 0;
var errors_1 = require("../../errors");
var request_1 = require("../../utils/request");
var warn_once_1 = require("../../utils/warn_once");
var byte_range_1 = require("../utils/byte_range");
var infer_segment_container_1 = require("../utils/infer_segment_container");
var add_segment_integrity_checks_to_loader_1 = require("./add_segment_integrity_checks_to_loader");
var construct_segment_url_1 = require("./construct_segment_url");
var init_segment_loader_1 = require("./init_segment_loader");
var low_latency_segment_loader_1 = require("./low_latency_segment_loader");
/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {string} url
 * @param {Object} context
 * @param {boolean} lowLatencyMode
 * @param {Object} options
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
function regularSegmentLoader(url, context, lowLatencyMode, options, callbacks, cancelSignal) {
    if (context.segment.isInit) {
        return (0, init_segment_loader_1.default)(url, context.segment, options, cancelSignal, callbacks);
    }
    var containerType = (0, infer_segment_container_1.default)(context.type, context.mimeType);
    if (lowLatencyMode && (containerType === "mp4" || containerType === undefined)) {
        if ((0, request_1.fetchIsSupported)()) {
            return (0, low_latency_segment_loader_1.default)(url, context, options, callbacks, cancelSignal);
        }
        else {
            (0, warn_once_1.default)("DASH: Your browser does not have the fetch API. You will have " +
                "a higher chance of rebuffering when playing close to the live edge");
        }
    }
    var segment = context.segment;
    return (0, request_1.default)({
        url: url,
        responseType: "arraybuffer",
        headers: segment.range !== undefined ? { Range: (0, byte_range_1.default)(segment.range) } : undefined,
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        cancelSignal: cancelSignal,
        onProgress: callbacks.onProgress,
    }).then(function (data) { return ({ resultType: "segment-loaded", resultData: data }); });
}
exports.regularSegmentLoader = regularSegmentLoader;
/**
 * @param {Object} config
 * @returns {Function}
 */
function generateSegmentLoader(_a) {
    var lowLatencyMode = _a.lowLatencyMode, customSegmentLoader = _a.segmentLoader, checkMediaSegmentIntegrity = _a.checkMediaSegmentIntegrity;
    return checkMediaSegmentIntegrity !== true
        ? segmentLoader
        : (0, add_segment_integrity_checks_to_loader_1.default)(segmentLoader);
    /**
     * @param {Object|null} wantedCdn
     * @param {Object} context
     * @param {Object} options
     * @param {Object} cancelSignal
     * @param {Object} callbacks
     * @returns {Promise.<Object>}
     */
    function segmentLoader(wantedCdn, context, options, cancelSignal, callbacks) {
        var url = (0, construct_segment_url_1.default)(wantedCdn, context.segment);
        if (url === null) {
            return Promise.resolve({
                resultType: "segment-created",
                resultData: null,
            });
        }
        if (lowLatencyMode || customSegmentLoader === undefined) {
            return regularSegmentLoader(url, context, lowLatencyMode, options, callbacks, cancelSignal);
        }
        return new Promise(function (res, rej) {
            /** `true` when the custom segmentLoader should not be active anymore. */
            var hasFinished = false;
            /**
             * Callback triggered when the custom segment loader has a response.
             * @param {Object} _args
             */
            var resolve = function (_args) {
                if (hasFinished || cancelSignal.isCancelled()) {
                    return;
                }
                hasFinished = true;
                cancelSignal.deregister(abortCustomLoader);
                res({
                    resultType: "segment-loaded",
                    resultData: {
                        responseData: _args.data,
                        size: _args.size,
                        requestDuration: _args.duration,
                    },
                });
            };
            /**
             * Callback triggered when the custom segment loader fails
             * @param {*} err - The corresponding error encountered
             */
            var reject = function (err) {
                var _a, _b;
                if (hasFinished || cancelSignal.isCancelled()) {
                    return;
                }
                hasFinished = true;
                cancelSignal.deregister(abortCustomLoader);
                // Format error and send it
                var castedErr = err;
                var message = (_a = castedErr === null || castedErr === void 0 ? void 0 : castedErr.message) !== null && _a !== void 0 ? _a : "Unknown error when fetching a DASH segment through a " +
                    "custom segmentLoader.";
                var emittedErr = new errors_1.CustomLoaderError(message, (_b = castedErr === null || castedErr === void 0 ? void 0 : castedErr.canRetry) !== null && _b !== void 0 ? _b : false, castedErr === null || castedErr === void 0 ? void 0 : castedErr.xhr);
                rej(emittedErr);
            };
            var progress = function (_args) {
                if (hasFinished || cancelSignal.isCancelled()) {
                    return;
                }
                callbacks.onProgress({
                    duration: _args.duration,
                    size: _args.size,
                    totalSize: _args.totalSize,
                });
            };
            /**
             * Callback triggered when the custom segment loader wants to fallback to
             * the "regular" implementation
             */
            var fallback = function () {
                if (hasFinished || cancelSignal.isCancelled()) {
                    return;
                }
                hasFinished = true;
                cancelSignal.deregister(abortCustomLoader);
                regularSegmentLoader(url, context, lowLatencyMode, options, callbacks, cancelSignal).then(res, rej);
            };
            var customCallbacks = { reject: reject, resolve: resolve, progress: progress, fallback: fallback };
            var byteRanges;
            if (context.segment.range !== undefined) {
                byteRanges = [context.segment.range];
                if (context.segment.indexRange !== undefined) {
                    byteRanges.push(context.segment.indexRange);
                }
            }
            var args = {
                isInit: context.segment.isInit,
                timeout: options.timeout,
                byteRanges: byteRanges,
                trackType: context.type,
                url: url,
            };
            var abort = customSegmentLoader(args, customCallbacks);
            cancelSignal.register(abortCustomLoader);
            /**
             * The logic to run when the custom loader is cancelled while pending.
             * @param {Error} err
             */
            function abortCustomLoader(err) {
                if (hasFinished) {
                    return;
                }
                hasFinished = true;
                if (typeof abort === "function") {
                    abort();
                }
                rej(err);
            }
        });
    }
}
exports.default = generateSegmentLoader;
