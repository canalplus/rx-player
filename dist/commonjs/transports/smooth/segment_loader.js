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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var errors_1 = require("../../errors");
var assert_1 = require("../../utils/assert");
var request_1 = require("../../utils/request");
var byte_range_1 = require("../utils/byte_range");
var check_isobmff_integrity_1 = require("../utils/check_isobmff_integrity");
var is_mp4_embedded_track_1 = require("./is_mp4_embedded_track");
var isobmff_1 = require("./isobmff");
/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {string} url
 * @param {Object} context
 * @param {Object} loaderOptions
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 * @param {boolean} checkMediaSegmentIntegrity
 * @returns {Promise}
 */
function regularSegmentLoader(url, context, callbacks, loaderOptions, cancelSignal, checkMediaSegmentIntegrity) {
    var headers;
    var range = context.segment.range;
    if (Array.isArray(range)) {
        headers = { Range: (0, byte_range_1.default)(range) };
    }
    return (0, request_1.default)({
        url: url,
        responseType: "arraybuffer",
        headers: headers,
        timeout: loaderOptions.timeout,
        connectionTimeout: loaderOptions.connectionTimeout,
        cancelSignal: cancelSignal,
        onProgress: callbacks.onProgress,
    }).then(function (data) {
        var isMP4 = (0, is_mp4_embedded_track_1.default)(context.mimeType);
        if (!isMP4 || checkMediaSegmentIntegrity !== true) {
            return { resultType: "segment-loaded", resultData: data };
        }
        var dataU8 = new Uint8Array(data.responseData);
        (0, check_isobmff_integrity_1.default)(dataU8, context.segment.isInit);
        return {
            resultType: "segment-loaded",
            resultData: __assign(__assign({}, data), { responseData: dataU8 }),
        };
    });
}
/**
 * Defines the url for the request, load the right loader (custom/default
 * one).
 */
var generateSegmentLoader = function (_a) {
    var checkMediaSegmentIntegrity = _a.checkMediaSegmentIntegrity, segmentLoader = _a.segmentLoader;
    return function (url, context, loaderOptions, cancelSignal, callbacks) {
        var segment = context.segment;
        if (segment.isInit) {
            if (segment.privateInfos === undefined ||
                segment.privateInfos.smoothInitSegment === undefined) {
                throw new Error("Smooth: Invalid segment format");
            }
            var smoothInitPrivateInfos = segment.privateInfos.smoothInitSegment;
            var responseData = void 0;
            var codecPrivateData = smoothInitPrivateInfos.codecPrivateData, timescale = smoothInitPrivateInfos.timescale, height = smoothInitPrivateInfos.height, width = smoothInitPrivateInfos.width, _a = smoothInitPrivateInfos.protection, protection = _a === void 0 ? { keyId: undefined, keySystems: undefined } : _a;
            if (codecPrivateData === undefined) {
                throw new Error("Smooth: no codec private data.");
            }
            switch (context.type) {
                case "video": {
                    responseData = (0, isobmff_1.createVideoInitSegment)(timescale, width !== null && width !== void 0 ? width : 0, height !== null && height !== void 0 ? height : 0, 72, 72, 4, // vRes, hRes, nal
                    codecPrivateData, protection.keyId);
                    break;
                }
                case "audio": {
                    var _b = smoothInitPrivateInfos.channels, channels = _b === void 0 ? 0 : _b, _c = smoothInitPrivateInfos.bitsPerSample, bitsPerSample = _c === void 0 ? 0 : _c, _d = smoothInitPrivateInfos.packetSize, packetSize = _d === void 0 ? 0 : _d, _e = smoothInitPrivateInfos.samplingRate, samplingRate = _e === void 0 ? 0 : _e;
                    responseData = (0, isobmff_1.createAudioInitSegment)(timescale, channels, bitsPerSample, packetSize, samplingRate, codecPrivateData, protection.keyId);
                    break;
                }
                default:
                    if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
                        (0, assert_1.default)(false, "responseData should have been set");
                    }
                    responseData = new Uint8Array(0);
            }
            return Promise.resolve({
                resultType: "segment-created",
                resultData: responseData,
            });
        }
        else if (url === null) {
            return Promise.resolve({
                resultType: "segment-created",
                resultData: null,
            });
        }
        else {
            if (typeof segmentLoader !== "function") {
                return regularSegmentLoader(url, context, callbacks, loaderOptions, cancelSignal, checkMediaSegmentIntegrity);
            }
            return new Promise(function (res, rej) {
                /** `true` when the custom segmentLoader should not be active anymore. */
                var hasFinished = false;
                /**
                 * Callback triggered when the custom segment loader has a response.
                 * @param {Object} args
                 */
                var resolve = function (_args) {
                    if (hasFinished || cancelSignal.isCancelled()) {
                        return;
                    }
                    hasFinished = true;
                    cancelSignal.deregister(abortCustomLoader);
                    var isMP4 = (0, is_mp4_embedded_track_1.default)(context.mimeType);
                    if (!isMP4 || checkMediaSegmentIntegrity !== true) {
                        res({
                            resultType: "segment-loaded",
                            resultData: {
                                responseData: _args.data,
                                size: _args.size,
                                requestDuration: _args.duration,
                            },
                        });
                    }
                    var dataU8 = _args.data instanceof Uint8Array ? _args.data : new Uint8Array(_args.data);
                    (0, check_isobmff_integrity_1.default)(dataU8, context.segment.isInit);
                    res({
                        resultType: "segment-loaded",
                        resultData: {
                            responseData: dataU8,
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
                    var message = (_a = castedErr === null || castedErr === void 0 ? void 0 : castedErr.message) !== null && _a !== void 0 ? _a : "Unknown error when fetching a Smooth segment through a " +
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
                var fallback = function () {
                    if (hasFinished || cancelSignal.isCancelled()) {
                        return;
                    }
                    hasFinished = true;
                    cancelSignal.deregister(abortCustomLoader);
                    regularSegmentLoader(url, context, callbacks, loaderOptions, cancelSignal, checkMediaSegmentIntegrity).then(res, rej);
                };
                var customCallbacks = { reject: reject, resolve: resolve, fallback: fallback, progress: progress };
                var byteRanges;
                if (context.segment.range !== undefined) {
                    byteRanges = [context.segment.range];
                    if (context.segment.indexRange !== undefined) {
                        byteRanges.push(context.segment.indexRange);
                    }
                }
                var args = {
                    isInit: context.segment.isInit,
                    timeout: loaderOptions.timeout,
                    byteRanges: byteRanges,
                    trackType: context.type,
                    url: url,
                };
                var abort = segmentLoader(args, customCallbacks);
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
                    if (!hasFinished && typeof abort === "function") {
                        abort();
                    }
                    rej(err);
                }
            });
        }
    };
};
exports.default = generateSegmentLoader;
