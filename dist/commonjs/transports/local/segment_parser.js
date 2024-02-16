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
var utils_1 = require("../../parsers/containers/isobmff/utils");
var matroska_1 = require("../../parsers/containers/matroska");
var get_isobmff_timing_infos_1 = require("../utils/get_isobmff_timing_infos");
var infer_segment_container_1 = require("../utils/infer_segment_container");
function segmentParser(loadedSegment, context, initTimescale) {
    var _a, _b;
    var segment = context.segment, periodStart = context.periodStart, periodEnd = context.periodEnd;
    var data = loadedSegment.data;
    var appendWindow = [periodStart, periodEnd];
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
            chunkSize: 0,
            chunkInfos: null,
            chunkOffset: 0,
            protectionData: [],
            appendWindow: appendWindow,
        };
    }
    var chunkData = new Uint8Array(data);
    var containerType = (0, infer_segment_container_1.default)(context.type, context.mimeType);
    // TODO take a look to check if this is an ISOBMFF/webm?
    var seemsToBeMP4 = containerType === "mp4" || containerType === undefined;
    var protectionData = [];
    if (seemsToBeMP4) {
        var psshInfo = (0, isobmff_1.takePSSHOut)(chunkData);
        var keyId = void 0;
        if (segment.isInit) {
            keyId = (_a = (0, utils_1.getKeyIdFromInitSegment)(chunkData)) !== null && _a !== void 0 ? _a : undefined;
        }
        if (psshInfo.length > 0 || keyId !== undefined) {
            protectionData.push({ initDataType: "cenc", keyId: keyId, initData: psshInfo });
        }
    }
    if (segment.isInit) {
        var timescale = containerType === "webm"
            ? (0, matroska_1.getTimeCodeScale)(chunkData, 0)
            : // assume ISOBMFF-compliance
                (0, isobmff_1.getMDHDTimescale)(chunkData);
        return {
            segmentType: "init",
            initializationData: chunkData,
            initializationDataSize: 0,
            initTimescale: timescale !== null && timescale !== void 0 ? timescale : undefined,
            protectionData: protectionData,
        };
    }
    var chunkInfos = seemsToBeMP4
        ? (0, get_isobmff_timing_infos_1.default)(chunkData, false, segment, initTimescale)
        : null; // TODO extract time info from webm
    var chunkOffset = (_b = segment.timestampOffset) !== null && _b !== void 0 ? _b : 0;
    return {
        segmentType: "media",
        chunkData: chunkData,
        chunkSize: chunkData.length,
        chunkInfos: chunkInfos,
        chunkOffset: chunkOffset,
        protectionData: protectionData,
        appendWindow: appendWindow,
    };
}
exports.default = segmentParser;
