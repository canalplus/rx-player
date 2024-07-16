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
 * Perform requests for "text" segments
 * @param {boolean} lowLatencyMode
 * @returns {Function}
 */
function generateTextTrackLoader(_a) {
    var lowLatencyMode = _a.lowLatencyMode, checkMediaSegmentIntegrity = _a.checkMediaSegmentIntegrity;
    return checkMediaSegmentIntegrity !== true
        ? textTrackLoader
        : (0, integrity_checks_1.addSegmentIntegrityChecks)(textTrackLoader);
    /**
     * @param {Object|null} wantedCdn
     * @param {Object} context
     * @param {Object} options
     * @param {Object} cancelSignal
     * @param {Object} callbacks
     * @returns {Promise}
     */
    function textTrackLoader(wantedCdn, context, options, cancelSignal, callbacks) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var segment, initialUrl, url, cmcdHeaders, headers, containerType, seemsToBeMP4, data;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        segment = context.segment;
                        initialUrl = (0, construct_segment_url_1.default)(wantedCdn, segment);
                        if (initialUrl === null) {
                            return [2 /*return*/, Promise.resolve({
                                    resultType: "segment-created",
                                    resultData: null,
                                })];
                        }
                        if (segment.isInit) {
                            return [2 /*return*/, (0, init_segment_loader_1.default)(initialUrl, segment, options, cancelSignal, callbacks)];
                        }
                        url = ((_a = options.cmcdPayload) === null || _a === void 0 ? void 0 : _a.type) === "query"
                            ? (0, add_query_string_1.default)(initialUrl, options.cmcdPayload.value)
                            : initialUrl;
                        cmcdHeaders = ((_b = options.cmcdPayload) === null || _b === void 0 ? void 0 : _b.type) === "headers" ? options.cmcdPayload.value : undefined;
                        if (segment.range !== undefined) {
                            headers = __assign(__assign({}, cmcdHeaders), { Range: (0, byte_range_1.default)(segment.range) });
                        }
                        else if (cmcdHeaders !== undefined) {
                            headers = cmcdHeaders;
                        }
                        containerType = (0, infer_segment_container_1.default)(context.type, context.mimeType);
                        seemsToBeMP4 = containerType === "mp4" || containerType === undefined;
                        if (lowLatencyMode && seemsToBeMP4) {
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
                        if (!seemsToBeMP4) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, request_1.default)({
                                url: url,
                                responseType: "arraybuffer",
                                headers: headers,
                                timeout: options.timeout,
                                connectionTimeout: options.connectionTimeout,
                                onProgress: callbacks.onProgress,
                                cancelSignal: cancelSignal,
                            })];
                    case 1:
                        data = _c.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, (0, request_1.default)({
                            url: url,
                            responseType: "text",
                            headers: headers,
                            timeout: options.timeout,
                            connectionTimeout: options.connectionTimeout,
                            onProgress: callbacks.onProgress,
                            cancelSignal: cancelSignal,
                        })];
                    case 3:
                        data = _c.sent();
                        _c.label = 4;
                    case 4: return [2 /*return*/, { resultType: "segment-loaded", resultData: data }];
                }
            });
        });
    }
}
exports.default = generateTextTrackLoader;
