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
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var get_isobmff_timing_infos_1 = require("../utils/get_isobmff_timing_infos");
var infer_segment_container_1 = require("../utils/infer_segment_container");
var get_events_out_of_emsgs_1 = require("./get_events_out_of_emsgs");
/**
 * @param {Object} config
 * @returns {Function}
 */
function generateAudioVideoSegmentParser(_a) {
    var __priv_patchLastSegmentInSidx = _a.__priv_patchLastSegmentInSidx;
    return function audioVideoSegmentParser(loadedSegment, context, initTimescale) {
        var _a, _b;
        var segment = context.segment, periodStart = context.periodStart, periodEnd = context.periodEnd;
        var data = loadedSegment.data, isChunked = loadedSegment.isChunked;
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
        var chunkData = data instanceof Uint8Array ? data : new Uint8Array(data);
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
                protectionData.push({
                    initDataType: "cenc",
                    keyId: keyId,
                    initData: psshInfo,
                });
            }
        }
        if (!segment.isInit) {
            var chunkInfos = seemsToBeMP4
                ? (0, get_isobmff_timing_infos_1.default)(chunkData, isChunked, segment, initTimescale)
                : null; // TODO extract time info from webm
            var chunkOffset = (_b = segment.timestampOffset) !== null && _b !== void 0 ? _b : 0;
            if (seemsToBeMP4) {
                var parsedEMSGs = (0, utils_1.parseEmsgBoxes)(chunkData);
                if (parsedEMSGs !== undefined) {
                    var whitelistedEMSGs = parsedEMSGs.filter(function (evt) {
                        if (segment.privateInfos === undefined ||
                            segment.privateInfos.isEMSGWhitelisted === undefined) {
                            return false;
                        }
                        return segment.privateInfos.isEMSGWhitelisted(evt);
                    });
                    var events = (0, get_events_out_of_emsgs_1.default)(whitelistedEMSGs, context.manifestPublishTime);
                    if (events !== undefined) {
                        var needsManifestRefresh = events.needsManifestRefresh, inbandEvents = events.inbandEvents;
                        return {
                            segmentType: "media",
                            chunkData: chunkData,
                            chunkSize: chunkData.length,
                            chunkInfos: chunkInfos,
                            chunkOffset: chunkOffset,
                            appendWindow: appendWindow,
                            inbandEvents: inbandEvents,
                            protectionData: protectionData,
                            needsManifestRefresh: needsManifestRefresh,
                        };
                    }
                }
            }
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
        // we're handling an initialization segment
        var indexRange = segment.indexRange;
        var segmentList;
        if (containerType === "webm") {
            segmentList = (0, matroska_1.getSegmentsFromCues)(chunkData, 0);
        }
        else if (seemsToBeMP4) {
            segmentList = (0, isobmff_1.getSegmentsFromSidx)(chunkData, Array.isArray(indexRange) ? indexRange[0] : 0);
            // This is a very specific handling for streams we know have a very
            // specific problem at Canal+: The last reference gives a truncated
            // segment.
            // Sadly, people on the packaging side could not fix all legacy contents.
            // This is an easy-but-ugly fix for those.
            // TODO Cleaner way? I tried to always check the obtained segment after
            // a byte-range request but it leads to a lot of code.
            if (__priv_patchLastSegmentInSidx === true &&
                segmentList !== null &&
                segmentList.length > 0) {
                var lastSegment = segmentList[segmentList.length - 1];
                if (Array.isArray(lastSegment.range)) {
                    lastSegment.range[1] = Infinity;
                }
            }
        }
        var timescale;
        if (seemsToBeMP4) {
            timescale = (0, isobmff_1.getMDHDTimescale)(chunkData);
        }
        else if (containerType === "webm") {
            timescale = (0, matroska_1.getTimeCodeScale)(chunkData, 0);
        }
        var parsedTimescale = (0, is_null_or_undefined_1.default)(timescale) ? undefined : timescale;
        return {
            segmentType: "init",
            initializationData: chunkData,
            initializationDataSize: chunkData.length,
            protectionData: protectionData,
            initTimescale: parsedTimescale,
            segmentList: segmentList !== null && segmentList !== void 0 ? segmentList : undefined,
        };
    };
}
exports.default = generateAudioVideoSegmentParser;
