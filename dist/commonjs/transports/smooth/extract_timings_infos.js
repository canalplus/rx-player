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
var log_1 = require("../../log");
var isobmff_1 = require("../../parsers/containers/isobmff");
var isobmff_2 = require("./isobmff");
/**
 * Try to obtain time information from the given data.
 * @param {Uint8Array} data
 * @param {boolean} isChunked
 * @param {Object} segment
 * @param {boolean} isLive
 * @returns {Object}
 */
function extractTimingsInfos(data, isChunked, initTimescale, segment, isLive) {
    var _a;
    var nextSegments = [];
    var chunkInfos;
    var tfxdSegment;
    var tfrfSegments;
    if (isLive) {
        var traf = (0, isobmff_1.getTRAF)(data);
        if (traf !== null) {
            tfrfSegments = (0, isobmff_2.parseTfrf)(traf);
            tfxdSegment = (0, isobmff_2.parseTfxd)(traf);
        }
        else {
            log_1.default.warn("smooth: could not find traf atom");
        }
    }
    if (tfrfSegments !== undefined) {
        for (var i = 0; i < tfrfSegments.length; i++) {
            nextSegments.push({
                time: tfrfSegments[i].time,
                duration: tfrfSegments[i].duration,
                timescale: initTimescale,
            });
        }
    }
    if (tfxdSegment !== undefined) {
        chunkInfos = {
            time: tfxdSegment.time / initTimescale,
            duration: tfxdSegment.duration / initTimescale,
        };
        return { nextSegments: nextSegments, chunkInfos: chunkInfos, scaledSegmentTime: tfxdSegment.time };
    }
    if (isChunked || !segment.complete) {
        return { nextSegments: nextSegments, chunkInfos: null, scaledSegmentTime: undefined };
    }
    var segmentDuration = segment.duration * initTimescale;
    // we could always make a mistake when reading a container.
    // If the estimate is too far from what the segment seems to imply, take
    // the segment infos instead.
    var maxDecodeTimeDelta = Math.min(initTimescale * 0.9, segmentDuration / 4);
    var trunDuration = (0, isobmff_1.getDurationFromTrun)(data);
    var scaledSegmentTime = ((_a = segment.privateInfos) === null || _a === void 0 ? void 0 : _a.smoothMediaSegment) !== undefined
        ? segment.privateInfos.smoothMediaSegment.time
        : Math.round(segment.time * initTimescale);
    if (trunDuration !== undefined &&
        Math.abs(trunDuration - segmentDuration) <= maxDecodeTimeDelta) {
        chunkInfos = { time: segment.time, duration: trunDuration / initTimescale };
    }
    else {
        chunkInfos = { time: segment.time, duration: segment.duration };
    }
    return { nextSegments: nextSegments, chunkInfos: chunkInfos, scaledSegmentTime: scaledSegmentTime };
}
exports.default = extractTimingsInfos;
