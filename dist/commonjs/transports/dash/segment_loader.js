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
exports.regularSegmentLoader = void 0;
var errors_1 = require("../../errors");
var request_1 = require("../../utils/request");
var warn_once_1 = require("../../utils/warn_once");
var add_query_string_1 = require("../utils/add_query_string");
var byte_range_1 = require("../utils/byte_range");
var infer_segment_container_1 = require("../utils/infer_segment_container");
var construct_segment_url_1 = require("./construct_segment_url");
var init_segment_loader_1 = require("./init_segment_loader");
var integrity_checks_1 = require("./integrity_checks");
var load_chunked_segment_data_1 = require("./load_chunked_segment_data");
/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {string} initialUrl
 * @param {Object} context
 * @param {boolean} lowLatencyMode
 * @param {Object} options
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
function regularSegmentLoader(initialUrl, context, lowLatencyMode, options, callbacks, cancelSignal) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var url, cmcdHeaders, segment, headers, containerType, data;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (context.segment.isInit) {
                        return [2 /*return*/, (0, init_segment_loader_1.default)(initialUrl, context.segment, options, cancelSignal, callbacks)];
                    }
                    url = ((_a = options.cmcdPayload) === null || _a === void 0 ? void 0 : _a.type) === "query"
                        ? (0, add_query_string_1.default)(initialUrl, options.cmcdPayload.value)
                        : initialUrl;
                    cmcdHeaders = ((_b = options.cmcdPayload) === null || _b === void 0 ? void 0 : _b.type) === "headers" ? options.cmcdPayload.value : undefined;
                    segment = context.segment;
                    if (segment.range !== undefined) {
                        headers = __assign(__assign({}, cmcdHeaders), { Range: (0, byte_range_1.default)(segment.range) });
                    }
                    else if (cmcdHeaders !== undefined) {
                        headers = cmcdHeaders;
                    }
                    containerType = (0, infer_segment_container_1.default)(context.type, context.mimeType);
                    if (lowLatencyMode && (containerType === "mp4" || containerType === undefined)) {
                        if ((0, request_1.fetchIsSupported)()) {
                            return [2 /*return*/, (0, load_chunked_segment_data_1.default)(url, {
                                    headers: headers,
                                    timeout: options.timeout,
                                    connectionTimeout: options.connectionTimeout,
                                }, callbacks, cancelSignal)];
                        }
                        else {
                            (0, warn_once_1.default)("DASH: Your browser does not have the fetch API. You will have " +
                                "a higher chance of rebuffering when playing close to the live edge");
                        }
                    }
                    return [4 /*yield*/, (0, request_1.default)({
                            url: url,
                            responseType: "arraybuffer",
                            headers: headers,
                            timeout: options.timeout,
                            connectionTimeout: options.connectionTimeout,
                            cancelSignal: cancelSignal,
                            onProgress: callbacks.onProgress,
                        })];
                case 1:
                    data = _c.sent();
                    return [2 /*return*/, { resultType: "segment-loaded", resultData: data }];
            }
        });
    });
}
exports.regularSegmentLoader = regularSegmentLoader;
/**
 * @param {Object} config
 * @returns {Function}
 */
function generateSegmentLoader(_a) {
    var lowLatencyMode = _a.lowLatencyMode, customSegmentLoader = _a.segmentLoader, checkMediaSegmentIntegrity = _a.checkMediaSegmentIntegrity;
    // XXX TODO what to do here?
    return checkMediaSegmentIntegrity !== true
        ? segmentLoader
        : (0, integrity_checks_1.addSegmentIntegrityChecks)(segmentLoader);
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
                cmcdPayload: options.cmcdPayload,
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
