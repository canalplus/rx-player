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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../../log");
var manifest_1 = require("../../../manifest");
var array_includes_1 = require("../../../utils/array_includes");
var assert_1 = require("../../../utils/assert");
var byte_parsing_1 = require("../../../utils/byte_parsing");
var is_non_empty_string_1 = require("../../../utils/is_non_empty_string");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
var object_assign_1 = require("../../../utils/object_assign");
var resolve_url_1 = require("../../../utils/resolve_url");
var string_parsing_1 = require("../../../utils/string_parsing");
var isobmff_1 = require("../../containers/isobmff");
var check_manifest_ids_1 = require("../utils/check_manifest_ids");
var get_codecs_1 = require("./get_codecs");
var parse_C_nodes_1 = require("./parse_C_nodes");
var parse_protection_node_1 = require("./parse_protection_node");
var representation_index_1 = require("./representation_index");
var shared_smooth_segment_timeline_1 = require("./shared_smooth_segment_timeline");
var parseBoolean_1 = require("./utils/parseBoolean");
var reduceChildren_1 = require("./utils/reduceChildren");
var tokens_1 = require("./utils/tokens");
var DEFAULT_MIME_TYPES = {
    audio: "audio/mp4",
    video: "video/mp4",
    text: "application/ttml+xml",
};
var MIME_TYPES = {
    AACL: "audio/mp4",
    AVC1: "video/mp4",
    H264: "video/mp4",
    TTML: "application/ttml+xml+mp4",
    DFXP: "application/ttml+xml+mp4",
};
/**
 * @param {Object|undefined} parserOptions
 * @returns {Function}
 */
function createSmoothStreamingParser(parserOptions) {
    if (parserOptions === void 0) { parserOptions = {}; }
    var referenceDateTime = parserOptions.referenceDateTime === undefined
        ? Date.UTC(1970, 0, 1, 0, 0, 0, 0) / 1000
        : parserOptions.referenceDateTime;
    var minRepresentationBitrate = parserOptions.minRepresentationBitrate === undefined
        ? 0
        : parserOptions.minRepresentationBitrate;
    var serverSyncInfos = parserOptions.serverSyncInfos;
    var serverTimeOffset = serverSyncInfos !== undefined
        ? serverSyncInfos.serverTimestamp - serverSyncInfos.clientTime
        : undefined;
    /**
     * @param {Element} q
     * @param {string} streamType
     * @return {Object}
     */
    function parseQualityLevel(q, streamType) {
        var customAttributes = (0, reduceChildren_1.default)(q, function (acc, qName, qNode) {
            if (qName === "CustomAttributes") {
                acc.push.apply(acc, __spreadArray([], __read((0, reduceChildren_1.default)(qNode, function (cAttrs, cName, cNode) {
                    if (cName === "Attribute") {
                        var name_1 = cNode.getAttribute("Name");
                        var value = cNode.getAttribute("Value");
                        if (name_1 !== null && value !== null) {
                            cAttrs.push(name_1 + "=" + value);
                        }
                    }
                    return cAttrs;
                }, [])), false));
            }
            return acc;
        }, []);
        /**
         * @param {string} name
         * @returns {string|undefined}
         */
        function getAttribute(name) {
            var attr = q.getAttribute(name);
            return attr === null ? undefined : attr;
        }
        switch (streamType) {
            case "audio": {
                var audiotag = getAttribute("AudioTag");
                var bitsPerSample = getAttribute("BitsPerSample");
                var channels = getAttribute("Channels");
                var codecPrivateData = getAttribute("CodecPrivateData");
                var fourCC = getAttribute("FourCC");
                var packetSize = getAttribute("PacketSize");
                var samplingRate = getAttribute("SamplingRate");
                var bitrateAttr = getAttribute("Bitrate");
                var bitrate = bitrateAttr === undefined ? 0 : parseInt(bitrateAttr, 10);
                bitrate = isNaN(bitrate) ? 0 : bitrate;
                if ((fourCC !== undefined && MIME_TYPES[fourCC] === undefined) ||
                    codecPrivateData === undefined) {
                    log_1.default.warn("Smooth parser: Unsupported audio codec. Ignoring quality level.");
                    return null;
                }
                var codecs = (0, get_codecs_1.getAudioCodecs)(codecPrivateData, fourCC);
                return {
                    audiotag: audiotag !== undefined ? parseInt(audiotag, 10) : audiotag,
                    bitrate: bitrate,
                    bitsPerSample: bitsPerSample !== undefined ? parseInt(bitsPerSample, 10) : bitsPerSample,
                    channels: channels !== undefined ? parseInt(channels, 10) : channels,
                    codecPrivateData: codecPrivateData,
                    codecs: codecs,
                    customAttributes: customAttributes,
                    mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] : fourCC,
                    packetSize: packetSize !== undefined ? parseInt(packetSize, 10) : packetSize,
                    samplingRate: samplingRate !== undefined ? parseInt(samplingRate, 10) : samplingRate,
                };
            }
            case "video": {
                var codecPrivateData = getAttribute("CodecPrivateData");
                var fourCC = getAttribute("FourCC");
                var width = getAttribute("MaxWidth");
                var height = getAttribute("MaxHeight");
                var bitrateAttr = getAttribute("Bitrate");
                var bitrate = bitrateAttr === undefined ? 0 : parseInt(bitrateAttr, 10);
                bitrate = isNaN(bitrate) ? 0 : bitrate;
                if ((fourCC !== undefined && MIME_TYPES[fourCC] === undefined) ||
                    codecPrivateData === undefined) {
                    log_1.default.warn("Smooth parser: Unsupported video codec. Ignoring quality level.");
                    return null;
                }
                var codecs = (0, get_codecs_1.getVideoCodecs)(codecPrivateData);
                return {
                    bitrate: bitrate,
                    customAttributes: customAttributes,
                    mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] : fourCC,
                    codecPrivateData: codecPrivateData,
                    codecs: codecs,
                    width: width !== undefined ? parseInt(width, 10) : undefined,
                    height: height !== undefined ? parseInt(height, 10) : undefined,
                };
            }
            case "text": {
                var codecPrivateData = getAttribute("CodecPrivateData");
                var fourCC = getAttribute("FourCC");
                var bitrateAttr = getAttribute("Bitrate");
                var bitrate = bitrateAttr === undefined ? 0 : parseInt(bitrateAttr, 10);
                bitrate = isNaN(bitrate) ? 0 : bitrate;
                return {
                    bitrate: bitrate,
                    customAttributes: customAttributes,
                    mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] : fourCC,
                    codecPrivateData: codecPrivateData !== null && codecPrivateData !== void 0 ? codecPrivateData : "",
                };
            }
            default:
                log_1.default.error("Smooth Parser: Unrecognized StreamIndex type: " + streamType);
                return null;
        }
    }
    /**
     * Parse the adaptations (<StreamIndex>) tree containing
     * representations (<QualityLevels>) and timestamp indexes (<c>).
     * Indexes can be quite huge, and this function needs to
     * to be optimized.
     * @param {Object} args
     * @returns {Object}
     */
    function parseAdaptation(args) {
        var root = args.root, timescale = args.timescale, baseUrl = args.baseUrl, protections = args.protections, timeShiftBufferDepth = args.timeShiftBufferDepth, manifestReceivedTime = args.manifestReceivedTime, isLive = args.isLive;
        var timescaleAttr = root.getAttribute("Timescale");
        var _timescale = timescaleAttr === null ? timescale : +timescaleAttr;
        if (isNaN(_timescale)) {
            _timescale = timescale;
        }
        var typeAttribute = root.getAttribute("Type");
        if (typeAttribute === null) {
            throw new Error("StreamIndex without type.");
        }
        if (!(0, array_includes_1.default)(manifest_1.SUPPORTED_ADAPTATIONS_TYPE, typeAttribute)) {
            log_1.default.warn("Smooth Parser: Unrecognized adaptation type:", typeAttribute);
        }
        var adaptationType = typeAttribute;
        var subType = root.getAttribute("Subtype");
        var language = root.getAttribute("Language");
        var UrlAttr = root.getAttribute("Url");
        var UrlPathWithTokens = UrlAttr === null ? "" : UrlAttr;
        if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
            (0, assert_1.default)(UrlPathWithTokens !== "");
        }
        var _a = (0, reduceChildren_1.default)(root, function (res, _name, node) {
            switch (_name) {
                case "QualityLevel":
                    var qualityLevel = parseQualityLevel(node, adaptationType);
                    if (qualityLevel === null) {
                        return res;
                    }
                    // filter out video qualityLevels with small bitrates
                    if (adaptationType !== "video" ||
                        qualityLevel.bitrate > minRepresentationBitrate) {
                        res.qualityLevels.push(qualityLevel);
                    }
                    break;
                case "c":
                    res.cNodes.push(node);
                    break;
            }
            return res;
        }, { qualityLevels: [], cNodes: [] }), qualityLevels = _a.qualityLevels, cNodes = _a.cNodes;
        var sharedSmoothTimeline = new shared_smooth_segment_timeline_1.default({
            timeline: (0, parse_C_nodes_1.default)(cNodes),
            timescale: _timescale,
            timeShiftBufferDepth: timeShiftBufferDepth,
            manifestReceivedTime: manifestReceivedTime,
        });
        // we assume that all qualityLevels have the same
        // codec and mimeType
        (0, assert_1.default)(qualityLevels.length !== 0, "Adaptation should have at least one playable representation.");
        var adaptationID = adaptationType + ((0, is_non_empty_string_1.default)(language) ? "_" + language : "");
        var representations = qualityLevels.map(function (qualityLevel) {
            var media = (0, tokens_1.replaceRepresentationSmoothTokens)(UrlPathWithTokens, qualityLevel.bitrate, qualityLevel.customAttributes);
            var mimeType = (0, is_non_empty_string_1.default)(qualityLevel.mimeType)
                ? qualityLevel.mimeType
                : DEFAULT_MIME_TYPES[adaptationType];
            var codecs = qualityLevel.codecs;
            var id = adaptationID +
                "_" +
                (!(0, is_null_or_undefined_1.default)(adaptationType) ? adaptationType + "-" : "") +
                (!(0, is_null_or_undefined_1.default)(mimeType) ? mimeType + "-" : "") +
                (!(0, is_null_or_undefined_1.default)(codecs) ? codecs + "-" : "") +
                String(qualityLevel.bitrate);
            var keyIDs = [];
            var firstProtection;
            if (protections.length > 0) {
                firstProtection = protections[0];
                protections.forEach(function (protection) {
                    var keyId = protection.keyId;
                    protection.keySystems.forEach(function (keySystem) {
                        keyIDs.push({ keyId: keyId, systemId: keySystem.systemId });
                    });
                });
            }
            var segmentPrivateInfos = {
                bitsPerSample: qualityLevel.bitsPerSample,
                channels: qualityLevel.channels,
                codecPrivateData: qualityLevel.codecPrivateData,
                packetSize: qualityLevel.packetSize,
                samplingRate: qualityLevel.samplingRate,
                height: qualityLevel.height,
                width: qualityLevel.width,
                // TODO set multiple protections here
                // instead of the first one
                protection: !(0, is_null_or_undefined_1.default)(firstProtection)
                    ? {
                        keyId: firstProtection.keyId,
                    }
                    : undefined,
            };
            var reprIndex = new representation_index_1.default({
                isLive: isLive,
                sharedSmoothTimeline: sharedSmoothTimeline,
                media: media,
                segmentPrivateInfos: segmentPrivateInfos,
            });
            var representation = (0, object_assign_1.default)({}, qualityLevel, {
                index: reprIndex,
                cdnMetadata: [{ baseUrl: baseUrl }],
                mimeType: mimeType,
                codecs: codecs,
                id: id,
            });
            if (keyIDs.length > 0 || firstProtection !== undefined) {
                var initDataValues = firstProtection === undefined
                    ? []
                    : firstProtection.keySystems.map(function (keySystemData) {
                        var systemId = keySystemData.systemId, privateData = keySystemData.privateData;
                        var cleanedSystemId = systemId.replace(/-/g, "");
                        var pssh = createPSSHBox(cleanedSystemId, privateData);
                        return { systemId: cleanedSystemId, data: pssh };
                    });
                if (initDataValues.length > 0) {
                    var initData = [{ type: "cenc", values: initDataValues }];
                    representation.contentProtections = { keyIds: keyIDs, initData: initData };
                }
                else {
                    representation.contentProtections = { keyIds: keyIDs, initData: [] };
                }
            }
            return representation;
        });
        // TODO(pierre): real ad-insert support
        if (subType === "ADVT") {
            return null;
        }
        var parsedAdaptation = {
            id: adaptationID,
            type: adaptationType,
            representations: representations,
            language: language === null ? undefined : language,
        };
        if (adaptationType === "text" && subType === "DESC") {
            parsedAdaptation.closedCaption = true;
        }
        return parsedAdaptation;
    }
    function parseFromDocument(doc, url, manifestReceivedTime) {
        var baseUrl = "";
        if (url !== undefined) {
            var filenameIdx = (0, resolve_url_1.getFilenameIndexInUrl)(url);
            baseUrl = url.substring(0, filenameIdx);
        }
        var root = doc.documentElement;
        if ((0, is_null_or_undefined_1.default)(root) || root.nodeName !== "SmoothStreamingMedia") {
            throw new Error("document root should be SmoothStreamingMedia");
        }
        var majorVersionAttr = root.getAttribute("MajorVersion");
        var minorVersionAttr = root.getAttribute("MinorVersion");
        if (majorVersionAttr === null ||
            minorVersionAttr === null ||
            !/^[2]-[0-2]$/.test(majorVersionAttr + "-" + minorVersionAttr)) {
            throw new Error("Version should be 2.0, 2.1 or 2.2");
        }
        var timescaleAttr = root.getAttribute("Timescale");
        var timescale = !(0, is_non_empty_string_1.default)(timescaleAttr) ? 10000000 : +timescaleAttr;
        if (isNaN(timescale)) {
            timescale = 10000000;
        }
        var _a = (0, reduceChildren_1.default)(root, function (res, name, node) {
            switch (name) {
                case "Protection": {
                    res.protections.push((0, parse_protection_node_1.default)(node, parserOptions.keySystems));
                    break;
                }
                case "StreamIndex":
                    res.adaptationNodes.push(node);
                    break;
            }
            return res;
        }, {
            adaptationNodes: [],
            protections: [],
        }), protections = _a.protections, adaptationNodes = _a.adaptationNodes;
        var initialAdaptations = {};
        var isLive = (0, parseBoolean_1.default)(root.getAttribute("IsLive"));
        var timeShiftBufferDepth;
        if (isLive) {
            var dvrWindowLength = root.getAttribute("DVRWindowLength");
            if (dvrWindowLength !== null &&
                !isNaN(+dvrWindowLength) &&
                +dvrWindowLength !== 0) {
                timeShiftBufferDepth = +dvrWindowLength / timescale;
            }
        }
        var adaptations = adaptationNodes.reduce(function (acc, node) {
            var adaptation = parseAdaptation({
                root: node,
                baseUrl: baseUrl,
                timescale: timescale,
                protections: protections,
                isLive: isLive,
                timeShiftBufferDepth: timeShiftBufferDepth,
                manifestReceivedTime: manifestReceivedTime,
            });
            if (adaptation === null) {
                return acc;
            }
            var type = adaptation.type;
            var adaps = acc[type];
            if (adaps === undefined) {
                acc[type] = [adaptation];
            }
            else {
                adaps.push(adaptation);
            }
            return acc;
        }, initialAdaptations);
        var suggestedPresentationDelay;
        var availabilityStartTime;
        var minimumTime;
        var timeshiftDepth = null;
        var maximumTimeData;
        var firstVideoAdaptation = adaptations.video !== undefined ? adaptations.video[0] : undefined;
        var firstAudioAdaptation = adaptations.audio !== undefined ? adaptations.audio[0] : undefined;
        /** Minimum time that can be reached regardless of the StreamIndex chosen. */
        var safeMinimumTime;
        /** Maximum time that can be reached regardless of the StreamIndex chosen. */
        var safeMaximumTime;
        /** Maximum time that can be reached in absolute on the content. */
        var unsafeMaximumTime;
        if (firstVideoAdaptation !== undefined || firstAudioAdaptation !== undefined) {
            var firstTimeReferences = [];
            var lastTimeReferences = [];
            if (firstVideoAdaptation !== undefined) {
                var firstVideoRepresentation = firstVideoAdaptation.representations[0];
                if (firstVideoRepresentation !== undefined) {
                    var firstVideoTimeReference = firstVideoRepresentation.index.getFirstAvailablePosition();
                    var lastVideoTimeReference = firstVideoRepresentation.index.getLastAvailablePosition();
                    if (!(0, is_null_or_undefined_1.default)(firstVideoTimeReference)) {
                        firstTimeReferences.push(firstVideoTimeReference);
                    }
                    if (!(0, is_null_or_undefined_1.default)(lastVideoTimeReference)) {
                        lastTimeReferences.push(lastVideoTimeReference);
                    }
                }
            }
            if (firstAudioAdaptation !== undefined) {
                var firstAudioRepresentation = firstAudioAdaptation.representations[0];
                if (firstAudioRepresentation !== undefined) {
                    var firstAudioTimeReference = firstAudioRepresentation.index.getFirstAvailablePosition();
                    var lastAudioTimeReference = firstAudioRepresentation.index.getLastAvailablePosition();
                    if (!(0, is_null_or_undefined_1.default)(firstAudioTimeReference)) {
                        firstTimeReferences.push(firstAudioTimeReference);
                    }
                    if (!(0, is_null_or_undefined_1.default)(lastAudioTimeReference)) {
                        lastTimeReferences.push(lastAudioTimeReference);
                    }
                }
            }
            if (firstTimeReferences.length > 0) {
                safeMinimumTime = Math.max.apply(Math, __spreadArray([], __read(firstTimeReferences), false));
            }
            if (lastTimeReferences.length > 0) {
                safeMaximumTime = Math.min.apply(Math, __spreadArray([], __read(lastTimeReferences), false));
                unsafeMaximumTime = Math.max.apply(Math, __spreadArray([], __read(lastTimeReferences), false));
            }
        }
        var manifestDuration = root.getAttribute("Duration");
        var duration = manifestDuration !== null && +manifestDuration !== 0
            ? +manifestDuration / timescale
            : undefined;
        if (isLive) {
            suggestedPresentationDelay = parserOptions.suggestedPresentationDelay;
            availabilityStartTime = referenceDateTime;
            minimumTime = safeMinimumTime !== null && safeMinimumTime !== void 0 ? safeMinimumTime : availabilityStartTime;
            var livePosition = unsafeMaximumTime;
            if (livePosition === undefined) {
                livePosition = Date.now() / 1000 - availabilityStartTime;
            }
            var maximumSafePosition = safeMaximumTime;
            if (maximumSafePosition === undefined) {
                maximumSafePosition = livePosition;
            }
            maximumTimeData = {
                isLinear: true,
                maximumSafePosition: maximumSafePosition,
                livePosition: livePosition,
                time: (0, monotonic_timestamp_1.default)(),
            };
            timeshiftDepth = timeShiftBufferDepth !== null && timeShiftBufferDepth !== void 0 ? timeShiftBufferDepth : null;
        }
        else {
            minimumTime = safeMinimumTime !== null && safeMinimumTime !== void 0 ? safeMinimumTime : 0;
            var maximumTime = safeMaximumTime;
            if (maximumTime === undefined) {
                maximumTime = duration !== undefined ? minimumTime + duration : Infinity;
            }
            maximumTimeData = {
                isLinear: false,
                maximumSafePosition: maximumTime,
                livePosition: undefined,
                time: (0, monotonic_timestamp_1.default)(),
            };
        }
        var periodStart = isLive ? 0 : minimumTime;
        var periodEnd = isLive ? undefined : maximumTimeData.maximumSafePosition;
        var manifest = {
            availabilityStartTime: availabilityStartTime === undefined ? 0 : availabilityStartTime,
            clockOffset: serverTimeOffset,
            isLive: isLive,
            isDynamic: isLive,
            isLastPeriodKnown: true,
            timeBounds: {
                minimumSafePosition: minimumTime,
                timeshiftDepth: timeshiftDepth,
                maximumTimeData: maximumTimeData,
            },
            periods: [
                {
                    adaptations: adaptations,
                    duration: periodEnd !== undefined ? periodEnd - periodStart : duration,
                    end: periodEnd,
                    id: "gen-smooth-period-0",
                    start: periodStart,
                },
            ],
            suggestedPresentationDelay: suggestedPresentationDelay,
            transportType: "smooth",
            uris: (0, is_null_or_undefined_1.default)(url) ? [] : [url],
        };
        (0, check_manifest_ids_1.default)(manifest);
        return manifest;
    }
    return parseFromDocument;
}
/**
 * @param {string} systemId - Hex string representing the CDM, 16 bytes.
 * @param {Uint8Array|undefined} privateData - Data associated to protection
 * specific system.
 * @returns {Uint8Array}
 */
function createPSSHBox(systemId, privateData) {
    if (systemId.length !== 32) {
        throw new Error("HSS: wrong system id length");
    }
    var version = 0;
    return (0, isobmff_1.createBox)("pssh", (0, byte_parsing_1.concat)([version, 0, 0, 0], (0, string_parsing_1.hexToBytes)(systemId), 
    /** To put there KIDs if it exists (necessitate PSSH v1) */
    (0, byte_parsing_1.itobe4)(privateData.length), privateData));
}
exports.default = createSmoothStreamingParser;
