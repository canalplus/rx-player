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
var isobmff_1 = require("../../parsers/containers/isobmff");
var string_parsing_1 = require("../../utils/string_parsing");
var get_isobmff_timing_infos_1 = require("../utils/get_isobmff_timing_infos");
var infer_segment_container_1 = require("../utils/infer_segment_container");
var parse_text_track_1 = require("../utils/parse_text_track");
/**
 * Parse TextTrack data when it is embedded in an ISOBMFF file.
 * @param {ArrayBuffer|Uint8Array|string} data - The segment data.
 * @param {boolean} isChunked - If `true`, the `data` may contain only a
 * decodable subpart of the full data in the linked segment.
 * @param {Object} context - Object describing the context of the given
 * segment's data: of which segment, `Representation`, `Adaptation`, `Period`,
 * `Manifest` it is a part of etc.
 * @param {number|undefined} initTimescale - `timescale` value - encountered
 * in this linked initialization segment (if it exists) - that may also apply
 * to that segment if no new timescale is defined in it.
 * Can be `undefined` if no timescale was defined, if it is not known, or if
 * no linked initialization segment was yet parsed.
 * @returns {Object}
 */
function parseISOBMFFEmbeddedTextTrack(data, isChunked, context, initTimescale) {
    var _a;
    var periodStart = context.periodStart, periodEnd = context.periodEnd, segment = context.segment;
    var chunkBytes;
    if (typeof data === "string") {
        chunkBytes = (0, string_parsing_1.strToUtf8)(data);
    }
    else if (data instanceof Uint8Array) {
        chunkBytes = data;
    }
    else {
        chunkBytes = new Uint8Array(data);
    }
    if (segment.isInit) {
        var mdhdTimescale = (0, isobmff_1.getMDHDTimescale)(chunkBytes);
        return {
            segmentType: "init",
            initializationData: null,
            initializationDataSize: 0,
            initTimescale: mdhdTimescale,
            protectionData: [],
        };
    }
    var chunkInfos = (0, get_isobmff_timing_infos_1.default)(chunkBytes, isChunked, segment, initTimescale);
    var chunkData = (0, parse_text_track_1.getISOBMFFEmbeddedTextTrackData)(context, chunkBytes, chunkInfos, isChunked);
    var chunkOffset = (_a = segment.timestampOffset) !== null && _a !== void 0 ? _a : 0;
    return {
        segmentType: "media",
        chunkData: chunkData,
        chunkSize: chunkBytes.length,
        chunkInfos: chunkInfos,
        chunkOffset: chunkOffset,
        protectionData: [],
        appendWindow: [periodStart, periodEnd],
    };
}
/**
 * Parse TextTrack data when it is in plain text form.
 * @param {ArrayBuffer|Uint8Array|string} data - The segment data.
 * @param {boolean} isChunked - If `true`, the `data` may contain only a
 * decodable subpart of the full data in the linked segment.
 * @param {Object} context - Object describing the context of the given
 * segment's data: of which segment, `Representation`, `Adaptation`, `Period`,
 * `Manifest` it is a part of etc.
 * @returns {Object}
 */
function parsePlainTextTrack(data, isChunked, context) {
    var _a;
    var segment = context.segment, periodStart = context.periodStart, periodEnd = context.periodEnd;
    if (segment.isInit) {
        return {
            segmentType: "init",
            initializationData: null,
            initializationDataSize: 0,
            initTimescale: undefined,
            protectionData: [],
        };
    }
    var textTrackData;
    var chunkSize;
    if (typeof data !== "string") {
        var bytesData = data instanceof Uint8Array ? data : new Uint8Array(data);
        textTrackData = (0, string_parsing_1.utf8ToStr)(bytesData);
        chunkSize = bytesData.length;
    }
    else {
        textTrackData = data;
    }
    var chunkData = (0, parse_text_track_1.getPlainTextTrackData)(context, textTrackData, isChunked);
    var chunkOffset = (_a = segment.timestampOffset) !== null && _a !== void 0 ? _a : 0;
    return {
        segmentType: "media",
        chunkData: chunkData,
        chunkSize: chunkSize,
        chunkInfos: null,
        chunkOffset: chunkOffset,
        protectionData: [],
        appendWindow: [periodStart, periodEnd],
    };
}
/**
 * Parse TextTrack data.
 * @param {Object} loadedSegment
 * @param {Object} context
 * @param {number | undefined} initTimescale
 * @returns {Object}
 */
function textTrackParser(loadedSegment, context, initTimescale) {
    var _a;
    var segment = context.segment, periodStart = context.periodStart, periodEnd = context.periodEnd;
    var data = loadedSegment.data, isChunked = loadedSegment.isChunked;
    if (data === null) {
        // No data, just return an empty placeholder object
        if (segment.isInit) {
            return {
                segmentType: "init",
                initializationData: null,
                initializationDataSize: 0,
                protectionData: [],
                initTimescale: undefined,
            };
        }
        var chunkOffset = (_a = segment.timestampOffset) !== null && _a !== void 0 ? _a : 0;
        return {
            segmentType: "media",
            chunkData: null,
            chunkSize: 0,
            chunkInfos: null,
            chunkOffset: chunkOffset,
            protectionData: [],
            appendWindow: [periodStart, periodEnd],
        };
    }
    var containerType = (0, infer_segment_container_1.default)(context.type, context.mimeType);
    // TODO take a look to check if this is an ISOBMFF/webm when undefined?
    if (containerType === "webm") {
        // TODO Handle webm containers
        throw new Error("Text tracks with a WEBM container are not yet handled.");
    }
    else if (containerType === "mp4") {
        return parseISOBMFFEmbeddedTextTrack(data, isChunked, context, initTimescale);
    }
    else {
        return parsePlainTextTrack(data, isChunked, context);
    }
}
exports.default = textTrackParser;
