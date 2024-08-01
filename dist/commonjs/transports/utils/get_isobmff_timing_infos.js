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
/**
 * Get precize start and duration of a chunk.
 * @param {UInt8Array} buffer - An ISOBMFF container (at least a `moof` + a
 * `mdat` box.
 * @param {Boolean} isChunked - If true, the whole segment was chunked into
 * multiple parts and buffer is one of them. If false, buffer is the whole
 * segment.
 * @param {Object} segment
 * @param {number|undefined} initTimescale
 * @returns {Object}
 */
function getISOBMFFTimingInfos(buffer, isChunked, segment, initTimescale) {
    var baseDecodeTime = (0, isobmff_1.getTrackFragmentDecodeTime)(buffer);
    if (baseDecodeTime === undefined || initTimescale === undefined) {
        return null;
    }
    var startTime = segment.timestampOffset !== undefined
        ? baseDecodeTime + segment.timestampOffset * initTimescale
        : baseDecodeTime;
    var trunDuration = (0, isobmff_1.getDurationFromTrun)(buffer);
    if (startTime < 0) {
        if (trunDuration !== undefined) {
            trunDuration += startTime; // remove from duration what comes before `0`
        }
        startTime = 0;
    }
    if (isChunked || !segment.complete) {
        if (trunDuration === undefined) {
            log_1.default.warn("DASH: Chunked segments should indicate a duration through their" + " trun boxes");
        }
        return {
            time: startTime / initTimescale,
            duration: trunDuration !== undefined ? trunDuration / initTimescale : undefined,
        };
    }
    var duration;
    var segmentDuration = segment.duration * initTimescale;
    // we could always make a mistake when reading a container.
    // If the estimate is too far from what the segment seems to imply, take
    // the segment infos instead.
    var maxDecodeTimeDelta = Math.min(initTimescale * 0.9, segmentDuration / 4);
    if (trunDuration !== undefined &&
        Math.abs(trunDuration - segmentDuration) <= maxDecodeTimeDelta) {
        duration = trunDuration;
    }
    return {
        time: startTime / initTimescale,
        duration: duration !== undefined ? duration / initTimescale : duration,
    };
}
exports.default = getISOBMFFTimingInfos;
