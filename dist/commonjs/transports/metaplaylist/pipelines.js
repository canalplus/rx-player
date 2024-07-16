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
var config_1 = require("../../config");
var features_1 = require("../../features");
var classes_1 = require("../../manifest/classes");
var metaplaylist_1 = require("../../parsers/manifest/metaplaylist");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var object_assign_1 = require("../../utils/object_assign");
var manifest_loader_1 = require("./manifest_loader");
/**
 * Get base - real - content from an offseted metaplaylist content.
 * @param {Object} mplContext
 * @returns {Object}
 */
function getOriginalContext(mplContext) {
    var _a;
    var segment = mplContext.segment;
    if (((_a = segment.privateInfos) === null || _a === void 0 ? void 0 : _a.metaplaylistInfos) === undefined) {
        throw new Error("MetaPlaylist: missing private infos");
    }
    var _b = segment.privateInfos.metaplaylistInfos, isLive = _b.isLive, periodStart = _b.periodStart, periodEnd = _b.periodEnd, manifestPublishTime = _b.manifestPublishTime;
    var originalSegment = segment.privateInfos.metaplaylistInfos.originalSegment;
    return {
        segment: originalSegment,
        type: mplContext.type,
        language: mplContext.language,
        mimeType: mplContext.mimeType,
        codecs: mplContext.codecs,
        isLive: isLive,
        periodStart: periodStart,
        periodEnd: periodEnd,
        manifestPublishTime: manifestPublishTime,
    };
}
/**
 * @param {Object} transports
 * @param {string} transportName
 * @param {Object} options
 * @returns {Object}
 */
function getTransportPipelines(transports, transportName, options) {
    var initialTransport = transports[transportName];
    if (initialTransport !== undefined) {
        return initialTransport;
    }
    var feature = features_1.default.transports[transportName];
    if (feature === undefined) {
        throw new Error("MetaPlaylist: Unknown transport ".concat(transportName, "."));
    }
    var transport = feature(options);
    transports[transportName] = transport;
    return transport;
}
/**
 * @param {Object} segment
 * @returns {Object}
 */
function getMetaPlaylistPrivateInfos(segment) {
    var privateInfos = segment.privateInfos;
    if ((privateInfos === null || privateInfos === void 0 ? void 0 : privateInfos.metaplaylistInfos) === undefined) {
        throw new Error("MetaPlaylist: Undefined transport for content for metaplaylist.");
    }
    return privateInfos.metaplaylistInfos;
}
function default_1(options) {
    var transports = {};
    var manifestLoader = (0, manifest_loader_1.default)({
        customManifestLoader: options.manifestLoader,
    });
    // remove some options that we might not want to apply to the
    // other streaming protocols used here
    var otherTransportOptions = (0, object_assign_1.default)({}, options, {
        manifestLoader: undefined,
    });
    var manifestPipeline = {
        loadManifest: manifestLoader,
        parseManifest: function (manifestData, parserOptions, onWarnings, cancelSignal, scheduleRequest) {
            var _a;
            var url = (_a = manifestData.url) !== null && _a !== void 0 ? _a : parserOptions.originalUrl;
            var responseData = manifestData.responseData;
            var mplParserOptions = {
                url: url,
                serverSyncInfos: options.serverSyncInfos,
            };
            var parsed = (0, metaplaylist_1.default)(responseData, mplParserOptions);
            return handleParsedResult(parsed);
            function handleParsedResult(parsedResult) {
                if (parsedResult.type === "done") {
                    var warnings = [];
                    var manifest = new classes_1.default(parsedResult.value, options, warnings);
                    return Promise.resolve({ manifest: manifest, warnings: warnings });
                }
                var parsedValue = parsedResult.value;
                var loaderProms = parsedValue.ressources.map(function (resource) {
                    var transport = getTransportPipelines(transports, resource.transportType, otherTransportOptions);
                    return scheduleRequest(loadSubManifest).then(function (data) {
                        return transport.manifest.parseManifest(data, __assign(__assign({}, parserOptions), { originalUrl: resource.url }), onWarnings, cancelSignal, scheduleRequest);
                    });
                    function loadSubManifest() {
                        /*
                         * Whether a ManifestLoader's timeout should be relied on here
                         * is ambiguous.
                         */
                        var manOpts = {
                            timeout: config_1.default.getCurrent().DEFAULT_REQUEST_TIMEOUT,
                            connectionTimeout: config_1.default.getCurrent().DEFAULT_CONNECTION_TIMEOUT,
                            cmcdPayload: undefined,
                        };
                        return transport.manifest.loadManifest(resource.url, manOpts, cancelSignal);
                    }
                });
                return Promise.all(loaderProms).then(function (parsedReqs) {
                    var loadedRessources = parsedReqs.map(function (e) { return e.manifest; });
                    return handleParsedResult(parsedResult.value.continue(loadedRessources));
                });
            }
        },
    };
    /**
     * @param {Object} segment
     * @returns {Object}
     */
    function getTransportPipelinesFromSegment(segment) {
        var transportType = getMetaPlaylistPrivateInfos(segment).transportType;
        return getTransportPipelines(transports, transportType, otherTransportOptions);
    }
    /**
     * @param {number} contentOffset
     * @param {number|undefined} contentEnd
     * @param {Object} segmentResponse
     * @returns {Object}
     */
    function offsetTimeInfos(contentOffset, contentEnd, segmentResponse) {
        var offsetedSegmentOffset = segmentResponse.chunkOffset + contentOffset;
        if ((0, is_null_or_undefined_1.default)(segmentResponse.chunkData)) {
            return {
                chunkInfos: segmentResponse.chunkInfos,
                chunkOffset: offsetedSegmentOffset,
                appendWindow: [undefined, undefined],
            };
        }
        // clone chunkInfos
        var chunkInfos = segmentResponse.chunkInfos, appendWindow = segmentResponse.appendWindow;
        var offsetedChunkInfos = chunkInfos === null ? null : (0, object_assign_1.default)({}, chunkInfos);
        if (offsetedChunkInfos !== null) {
            offsetedChunkInfos.time += contentOffset;
        }
        var offsetedWindowStart = appendWindow[0] !== undefined
            ? Math.max(appendWindow[0] + contentOffset, contentOffset)
            : contentOffset;
        var offsetedWindowEnd;
        if (appendWindow[1] !== undefined) {
            offsetedWindowEnd =
                contentEnd !== undefined
                    ? Math.min(appendWindow[1] + contentOffset, contentEnd)
                    : appendWindow[1] + contentOffset;
        }
        else if (contentEnd !== undefined) {
            offsetedWindowEnd = contentEnd;
        }
        return {
            chunkInfos: offsetedChunkInfos,
            chunkOffset: offsetedSegmentOffset,
            appendWindow: [offsetedWindowStart, offsetedWindowEnd],
        };
    }
    var audioPipeline = {
        loadSegment: function (wantedCdn, context, loaderOptions, cancelToken, callbacks) {
            var segment = context.segment;
            var audio = getTransportPipelinesFromSegment(segment).audio;
            var ogContext = getOriginalContext(context);
            return audio.loadSegment(wantedCdn, ogContext, loaderOptions, cancelToken, callbacks);
        },
        parseSegment: function (loadedSegment, context, initTimescale) {
            var segment = context.segment;
            var _a = getMetaPlaylistPrivateInfos(segment), contentStart = _a.contentStart, contentEnd = _a.contentEnd;
            var audio = getTransportPipelinesFromSegment(segment).audio;
            var ogContext = getOriginalContext(context);
            var parsed = audio.parseSegment(loadedSegment, ogContext, initTimescale);
            if (parsed.segmentType === "init") {
                return parsed;
            }
            var timeInfos = offsetTimeInfos(contentStart, contentEnd, parsed);
            return (0, object_assign_1.default)({}, parsed, timeInfos);
        },
    };
    var videoPipeline = {
        loadSegment: function (wantedCdn, context, loaderOptions, cancelToken, callbacks) {
            var segment = context.segment;
            var video = getTransportPipelinesFromSegment(segment).video;
            var ogContext = getOriginalContext(context);
            return video.loadSegment(wantedCdn, ogContext, loaderOptions, cancelToken, callbacks);
        },
        parseSegment: function (loadedSegment, context, initTimescale) {
            var segment = context.segment;
            var _a = getMetaPlaylistPrivateInfos(segment), contentStart = _a.contentStart, contentEnd = _a.contentEnd;
            var video = getTransportPipelinesFromSegment(segment).video;
            var ogContext = getOriginalContext(context);
            var parsed = video.parseSegment(loadedSegment, ogContext, initTimescale);
            if (parsed.segmentType === "init") {
                return parsed;
            }
            var timeInfos = offsetTimeInfos(contentStart, contentEnd, parsed);
            return (0, object_assign_1.default)({}, parsed, timeInfos);
        },
    };
    var textTrackPipeline = {
        loadSegment: function (wantedCdn, context, loaderOptions, cancelToken, callbacks) {
            var segment = context.segment;
            var text = getTransportPipelinesFromSegment(segment).text;
            var ogContext = getOriginalContext(context);
            return text.loadSegment(wantedCdn, ogContext, loaderOptions, cancelToken, callbacks);
        },
        parseSegment: function (loadedSegment, context, initTimescale) {
            var segment = context.segment;
            var _a = getMetaPlaylistPrivateInfos(segment), contentStart = _a.contentStart, contentEnd = _a.contentEnd;
            var text = getTransportPipelinesFromSegment(segment).text;
            var ogContext = getOriginalContext(context);
            var parsed = text.parseSegment(loadedSegment, ogContext, initTimescale);
            if (parsed.segmentType === "init") {
                return parsed;
            }
            var timeInfos = offsetTimeInfos(contentStart, contentEnd, parsed);
            return (0, object_assign_1.default)({}, parsed, timeInfos);
        },
    };
    return {
        transportName: "metaplaylist",
        manifest: manifestPipeline,
        audio: audioPipeline,
        video: videoPipeline,
        text: textTrackPipeline,
    };
}
exports.default = default_1;
