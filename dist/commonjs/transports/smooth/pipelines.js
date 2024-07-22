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
var log_1 = require("../../log");
var classes_1 = require("../../manifest/classes");
var isobmff_1 = require("../../parsers/containers/isobmff");
var smooth_1 = require("../../parsers/manifest/smooth");
var request_1 = require("../../utils/request");
var string_parsing_1 = require("../../utils/string_parsing");
var add_query_string_1 = require("../utils/add_query_string");
var check_isobmff_integrity_1 = require("../utils/check_isobmff_integrity");
var generate_manifest_loader_1 = require("../utils/generate_manifest_loader");
var extract_timings_infos_1 = require("./extract_timings_infos");
var is_mp4_embedded_track_1 = require("./is_mp4_embedded_track");
var isobmff_2 = require("./isobmff");
var segment_loader_1 = require("./segment_loader");
var utils_1 = require("./utils");
function default_1(transportOptions) {
    var smoothManifestParser = (0, smooth_1.default)(transportOptions);
    var segmentLoader = (0, segment_loader_1.default)(transportOptions);
    var manifestLoaderOptions = {
        customManifestLoader: transportOptions.manifestLoader,
    };
    var manifestLoader = (0, generate_manifest_loader_1.default)(manifestLoaderOptions, "text", null);
    var manifestPipeline = {
        loadManifest: manifestLoader,
        parseManifest: function (manifestData, parserOptions) {
            var _a;
            var url = (_a = manifestData.url) !== null && _a !== void 0 ? _a : parserOptions.originalUrl;
            var manifestReceivedTime = manifestData.receivedTime, responseData = manifestData.responseData;
            var documentData = typeof responseData === "string"
                ? new DOMParser().parseFromString(responseData, "text/xml")
                : responseData; // TODO find a way to check if Document?
            var parserResult = smoothManifestParser(documentData, url, manifestReceivedTime);
            var warnings = [];
            var manifest = new classes_1.default(parserResult, {
                representationFilter: transportOptions.representationFilter,
            }, warnings);
            return { manifest: manifest, url: url, warnings: warnings };
        },
    };
    /**
     * Export functions allowing to load and parse audio and video smooth
     * segments.
     */
    var audioVideoPipeline = {
        /**
         * Load a Smooth audio/video segment.
         * @param {Object|null} wantedCdn
         * @param {Object} context
         * @param {Object} loaderOptions
         * @param {Object} cancelSignal
         * @param {Object} callbacks
         * @returns {Promise}
         */
        loadSegment: function (wantedCdn, context, loaderOptions, cancelSignal, callbacks) {
            var url = (0, utils_1.constructSegmentUrl)(wantedCdn, context.segment);
            return segmentLoader(url, context, loaderOptions, cancelSignal, callbacks);
        },
        parseSegment: function (loadedSegment, context, initTimescale) {
            var _a, _b;
            var segment = context.segment;
            var data = loadedSegment.data, isChunked = loadedSegment.isChunked;
            if (data === null) {
                if (segment.isInit) {
                    return {
                        segmentType: "init",
                        initializationData: null,
                        initializationDataSize: 0,
                        protectionData: [],
                        initTimescale: undefined,
                    };
                }
                return {
                    segmentType: "media",
                    chunkData: null,
                    chunkInfos: null,
                    chunkOffset: 0,
                    chunkSize: 0,
                    protectionData: [],
                    appendWindow: [undefined, undefined],
                };
            }
            var responseBuffer = data instanceof Uint8Array ? data : new Uint8Array(data);
            if (segment.isInit) {
                var timescale = (_b = (_a = segment.privateInfos) === null || _a === void 0 ? void 0 : _a.smoothInitSegment) === null || _b === void 0 ? void 0 : _b.timescale;
                return {
                    segmentType: "init",
                    initializationData: data,
                    initializationDataSize: data.byteLength,
                    // smooth init segments are crafted by hand.
                    // Their timescale is the one from the manifest.
                    initTimescale: timescale,
                    protectionData: [],
                };
            }
            var timingInfos = initTimescale !== undefined
                ? (0, extract_timings_infos_1.default)(responseBuffer, isChunked, initTimescale, segment, context.isLive)
                : null;
            if (timingInfos === null ||
                timingInfos.chunkInfos === null ||
                timingInfos.scaledSegmentTime === undefined) {
                throw new Error("Smooth Segment without time information");
            }
            var nextSegments = timingInfos.nextSegments, chunkInfos = timingInfos.chunkInfos, scaledSegmentTime = timingInfos.scaledSegmentTime;
            var chunkData = (0, isobmff_2.patchSegment)(responseBuffer, scaledSegmentTime);
            var predictedSegments = nextSegments.length > 0 ? nextSegments : undefined;
            return {
                segmentType: "media",
                chunkData: chunkData,
                chunkInfos: chunkInfos,
                chunkOffset: 0,
                chunkSize: chunkData.length,
                protectionData: [],
                predictedSegments: predictedSegments,
                appendWindow: [undefined, undefined],
            };
        },
    };
    var textTrackPipeline = {
        loadSegment: function (wantedCdn, context, loaderOptions, cancelSignal, callbacks) {
            var _a, _b, _c, _d;
            var segment = context.segment;
            var url = (0, utils_1.constructSegmentUrl)(wantedCdn, segment);
            if (segment.isInit || url === null) {
                return Promise.resolve({
                    resultType: "segment-created",
                    resultData: null,
                });
            }
            var isMP4 = (0, is_mp4_embedded_track_1.default)(context.mimeType);
            if (!isMP4) {
                return (0, request_1.default)({
                    url: ((_a = loaderOptions.cmcdPayload) === null || _a === void 0 ? void 0 : _a.type) === "query"
                        ? (0, add_query_string_1.default)(url, loaderOptions.cmcdPayload.value)
                        : url,
                    headers: ((_b = loaderOptions.cmcdPayload) === null || _b === void 0 ? void 0 : _b.type) === "headers"
                        ? loaderOptions.cmcdPayload.value
                        : undefined,
                    responseType: "text",
                    timeout: loaderOptions.timeout,
                    connectionTimeout: loaderOptions.connectionTimeout,
                    cancelSignal: cancelSignal,
                    onProgress: callbacks.onProgress,
                }).then(function (data) { return ({
                    resultType: "segment-loaded",
                    resultData: data,
                }); });
            }
            else {
                return (0, request_1.default)({
                    url: ((_c = loaderOptions.cmcdPayload) === null || _c === void 0 ? void 0 : _c.type) === "query"
                        ? (0, add_query_string_1.default)(url, loaderOptions.cmcdPayload.value)
                        : url,
                    headers: ((_d = loaderOptions.cmcdPayload) === null || _d === void 0 ? void 0 : _d.type) === "headers"
                        ? loaderOptions.cmcdPayload.value
                        : undefined,
                    responseType: "arraybuffer",
                    timeout: loaderOptions.timeout,
                    connectionTimeout: loaderOptions.connectionTimeout,
                    cancelSignal: cancelSignal,
                    onProgress: callbacks.onProgress,
                }).then(function (data) {
                    if (transportOptions.checkMediaSegmentIntegrity !== true) {
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
        },
        parseSegment: function (loadedSegment, context, initTimescale) {
            var _a;
            var segment = context.segment, language = context.language, _b = context.mimeType, mimeType = _b === void 0 ? "" : _b, _c = context.codecs, codecs = _c === void 0 ? "" : _c;
            var isMP4 = (0, is_mp4_embedded_track_1.default)(context.mimeType);
            var data = loadedSegment.data, isChunked = loadedSegment.isChunked;
            var chunkSize;
            if (segment.isInit) {
                // text init segment has no use in HSS
                return {
                    segmentType: "init",
                    initializationData: null,
                    initializationDataSize: 0,
                    protectionData: [],
                    initTimescale: undefined,
                };
            }
            if (data === null) {
                return {
                    segmentType: "media",
                    chunkData: null,
                    chunkInfos: null,
                    chunkOffset: 0,
                    chunkSize: 0,
                    protectionData: [],
                    appendWindow: [undefined, undefined],
                };
            }
            var nextSegments;
            var chunkInfos = null;
            var segmentStart;
            var segmentEnd;
            var _sdData;
            var _sdType;
            if (isMP4) {
                var chunkBytes = void 0;
                if (typeof data === "string") {
                    chunkBytes = (0, string_parsing_1.strToUtf8)(data);
                }
                else {
                    chunkBytes = data instanceof Uint8Array ? data : new Uint8Array(data);
                }
                chunkSize = chunkBytes.length;
                var timingInfos = initTimescale !== undefined
                    ? (0, extract_timings_infos_1.default)(chunkBytes, isChunked, initTimescale, segment, context.isLive)
                    : null;
                nextSegments = timingInfos === null || timingInfos === void 0 ? void 0 : timingInfos.nextSegments;
                chunkInfos = (_a = timingInfos === null || timingInfos === void 0 ? void 0 : timingInfos.chunkInfos) !== null && _a !== void 0 ? _a : null;
                if (chunkInfos === null) {
                    if (isChunked) {
                        log_1.default.warn("Smooth: Unavailable time data for current text track.");
                    }
                    else {
                        segmentStart = segment.time;
                        segmentEnd = segment.end;
                    }
                }
                else {
                    segmentStart = chunkInfos.time;
                    segmentEnd =
                        chunkInfos.duration !== undefined
                            ? chunkInfos.time + chunkInfos.duration
                            : segment.end;
                }
                var lcCodec = codecs.toLowerCase();
                if (mimeType === "application/ttml+xml+mp4" ||
                    lcCodec === "stpp" ||
                    lcCodec === "stpp.ttml.im1t") {
                    _sdType = "ttml";
                }
                else if (lcCodec === "wvtt") {
                    _sdType = "vtt";
                }
                else {
                    throw new Error("could not find a text-track parser for the type ".concat(mimeType));
                }
                var mdat = (0, isobmff_1.getMDAT)(chunkBytes);
                _sdData = mdat === null ? "" : (0, string_parsing_1.utf8ToStr)(mdat);
            }
            else {
                // not MP4
                segmentStart = segment.time;
                segmentEnd = segment.end;
                var chunkString = void 0;
                if (typeof data !== "string") {
                    var bytesData = data instanceof Uint8Array ? data : new Uint8Array(data);
                    chunkSize = bytesData.length;
                    chunkString = (0, string_parsing_1.utf8ToStr)(bytesData);
                }
                else {
                    chunkString = data;
                }
                switch (mimeType) {
                    case "application/x-sami":
                    case "application/smil": // TODO SMIL should be its own format, no?
                        _sdType = "sami";
                        break;
                    case "application/ttml+xml":
                        _sdType = "ttml";
                        break;
                    case "text/vtt":
                        _sdType = "vtt";
                        break;
                }
                if (_sdType === undefined) {
                    var lcCodec = codecs.toLowerCase();
                    if (lcCodec === "srt") {
                        _sdType = "srt";
                    }
                    else {
                        throw new Error("could not find a text-track parser for the type ".concat(mimeType));
                    }
                }
                _sdData = chunkString;
            }
            var predictedSegments = Array.isArray(nextSegments) && nextSegments.length > 0 ? nextSegments : undefined;
            var chunkOffset = segmentStart !== null && segmentStart !== void 0 ? segmentStart : 0;
            return {
                segmentType: "media",
                chunkData: {
                    type: _sdType,
                    data: _sdData,
                    start: segmentStart,
                    end: segmentEnd,
                    language: language,
                },
                chunkSize: chunkSize,
                chunkInfos: chunkInfos,
                chunkOffset: chunkOffset,
                protectionData: [],
                predictedSegments: predictedSegments,
                appendWindow: [undefined, undefined],
            };
        },
    };
    return {
        transportName: "smooth",
        manifest: manifestPipeline,
        audio: audioVideoPipeline,
        video: audioVideoPipeline,
        text: textTrackPipeline,
    };
}
exports.default = default_1;
