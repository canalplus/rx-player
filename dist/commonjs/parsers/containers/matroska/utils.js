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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSegmentsFromCues = exports.getTimeCodeScale = void 0;
var log_1 = require("../../../log");
var SEGMENT_ID = 0x18538067;
var INFO_ID = 0x1549a966;
var TIMECODESCALE_ID = 0x2ad7b1;
var DURATION_ID = 0x4489;
var CUES_ID = 0x1c53bb6b;
var CUE_POINT_ID = 0xbb;
var CUE_TIME_ID = 0xb3;
var CUE_TRACK_POSITIONS_ID = 0xb7;
var CUE_CLUSTER_POSITIONS_ID = 0xf1;
/**
 * Find the offsets of the value linked to the given element ID.
 * @param {number} elementID - ID for the searched element.
 * @param {Array.<number>} parents - eventual IDs of the parent elements. From
 * top level to lower level (from the furthest to the closest).
 * @param {Uint8Array} buffer - buffer where the ID will be searched
 * @param {Array.<number>} range - start and end offsets in the buffer where the
 * ID will be searched.
 * @returns {Array.<number>|null}
 */
function findNextElement(elementID, parents, buffer, _a) {
    var _b = __read(_a, 2), initialOffset = _b[0], maxOffset = _b[1];
    var currentOffset = initialOffset;
    while (currentOffset < maxOffset) {
        var parsedID = getEBMLID(buffer, currentOffset);
        if (parsedID === null) {
            return null;
        }
        var ebmlTagID = parsedID.value, ebmlTagLength = parsedID.length;
        var sizeOffset = currentOffset + ebmlTagLength;
        var parsedValue = getEBMLValue(buffer, sizeOffset);
        if (parsedValue === null) {
            return null;
        }
        var valueLengthLength = parsedValue.length, valueLength = parsedValue.value;
        var valueOffset = sizeOffset + valueLengthLength;
        var valueEndOffset = valueOffset + valueLength;
        if (ebmlTagID === elementID) {
            return [valueOffset, valueEndOffset];
        }
        else if (parents.length > 0) {
            for (var i = 0; i < parents.length; i++) {
                if (ebmlTagID === parents[i]) {
                    var newParents = parents.slice(i + 1, parents.length);
                    return findNextElement(elementID, newParents, buffer, [
                        valueOffset,
                        valueEndOffset,
                    ]);
                }
            }
        }
        currentOffset = valueEndOffset;
    }
    return null;
}
/**
 * Return the timecode scale (basically timescale) of the whole file.
 * @param {Uint8Array} buffer
 * @param {number} initialOffset
 * @returns {number|null}
 */
function getTimeCodeScale(buffer, initialOffset) {
    var timeCodeScaleOffsets = findNextElement(TIMECODESCALE_ID, [SEGMENT_ID, INFO_ID], buffer, [initialOffset, buffer.length]);
    if (timeCodeScaleOffsets === null) {
        return null;
    }
    var length = timeCodeScaleOffsets[1] - timeCodeScaleOffsets[0];
    return 1e9 / bytesToNumber(buffer, timeCodeScaleOffsets[0], length);
}
exports.getTimeCodeScale = getTimeCodeScale;
/**
 * Return the duration of the concerned media.
 * @param {Uint8Array} buffer
 * @param {number} initialOffset
 * @returns {number|null}
 */
function getDuration(buffer, initialOffset) {
    var timeCodeScaleOffsets = findNextElement(DURATION_ID, [SEGMENT_ID, INFO_ID], buffer, [initialOffset, buffer.length]);
    if (timeCodeScaleOffsets === null) {
        return null;
    }
    var length = timeCodeScaleOffsets[1] - timeCodeScaleOffsets[0];
    if (length === 4) {
        return get_IEEE754_32Bits(buffer, timeCodeScaleOffsets[0]);
    }
    else if (length === 8) {
        return get_IEEE754_64Bits(buffer, timeCodeScaleOffsets[0]);
    }
    return null;
}
/**
 * @param {Uint8Array} buffer
 * @param {number} initialOffset
 * @returns {Array.<Object>|null}
 */
function getSegmentsFromCues(buffer, initialOffset) {
    var segmentRange = findNextElement(SEGMENT_ID, [], buffer, [
        initialOffset,
        buffer.length,
    ]);
    if (segmentRange === null) {
        return null;
    }
    var _a = __read(segmentRange, 2), segmentRangeStart = _a[0], segmentRangeEnd = _a[1];
    var timescale = getTimeCodeScale(buffer, segmentRangeStart);
    if (timescale === null) {
        return null;
    }
    var duration = getDuration(buffer, segmentRangeStart);
    if (duration === null) {
        return null;
    }
    var cuesRange = findNextElement(CUES_ID, [], buffer, [
        segmentRangeStart,
        segmentRangeEnd,
    ]);
    if (cuesRange === null) {
        return null;
    }
    var rawInfos = [];
    var currentOffset = cuesRange[0];
    while (currentOffset < cuesRange[1]) {
        var cuePointRange = findNextElement(CUE_POINT_ID, [], buffer, [
            currentOffset,
            cuesRange[1],
        ]);
        if (cuePointRange === null) {
            break;
        }
        var cueTimeRange = findNextElement(CUE_TIME_ID, [], buffer, [
            cuePointRange[0],
            cuePointRange[1],
        ]);
        if (cueTimeRange === null) {
            return null;
        }
        var time = bytesToNumber(buffer, cueTimeRange[0], cueTimeRange[1] - cueTimeRange[0]);
        var cueOffsetRange = findNextElement(CUE_CLUSTER_POSITIONS_ID, [CUE_TRACK_POSITIONS_ID], buffer, [cuePointRange[0], cuePointRange[1]]);
        if (cueOffsetRange === null) {
            return null;
        }
        var rangeStart = bytesToNumber(buffer, cueOffsetRange[0], cueOffsetRange[1] - cueOffsetRange[0]) +
            segmentRangeStart;
        rawInfos.push({ time: time, rangeStart: rangeStart });
        currentOffset = cuePointRange[1];
    }
    var segments = [];
    for (var i = 0; i < rawInfos.length; i++) {
        var currentSegment = rawInfos[i];
        if (i === rawInfos.length - 1) {
            segments.push({
                time: currentSegment.time,
                timescale: timescale,
                duration: i === 0 ? duration : duration - currentSegment.time,
                range: [currentSegment.rangeStart, Infinity],
            });
        }
        else {
            segments.push({
                time: currentSegment.time,
                timescale: timescale,
                duration: rawInfos[i + 1].time - currentSegment.time,
                range: [currentSegment.rangeStart, rawInfos[i + 1].rangeStart - 1],
            });
        }
    }
    return segments;
}
exports.getSegmentsFromCues = getSegmentsFromCues;
function getLength(buffer, offset) {
    for (var length_1 = 1; length_1 <= 8; length_1++) {
        if (buffer[offset] >= Math.pow(2, 8 - length_1)) {
            return length_1;
        }
    }
    return undefined;
}
function getEBMLID(buffer, offset) {
    var length = getLength(buffer, offset);
    if (length === undefined) {
        log_1.default.warn("webm: unrepresentable length");
        return null;
    }
    if (offset + length > buffer.length) {
        log_1.default.warn("webm: impossible length");
        return null;
    }
    var value = 0;
    for (var i = 0; i < length; i++) {
        value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return { length: length, value: value };
}
function getEBMLValue(buffer, offset) {
    var length = getLength(buffer, offset);
    if (length === undefined) {
        log_1.default.warn("webm: unrepresentable length");
        return null;
    }
    if (offset + length > buffer.length) {
        log_1.default.warn("webm: impossible length");
        return null;
    }
    var value = (buffer[offset] & ((1 << (8 - length)) - 1)) * Math.pow(2, (length - 1) * 8);
    for (var i = 1; i < length; i++) {
        value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return { length: length, value: value };
}
/**
 * Convert a IEEE754 32 bits floating number as an Uint8Array into its
 * corresponding Number.
 * @param {Uint8Array} buffer
 * @param {number} offset
 * @returns {number}
 */
function get_IEEE754_32Bits(buffer, offset) {
    return new DataView(buffer.buffer).getFloat32(offset);
}
/**
 * Convert a IEEE754 64 bits floating number as an Uint8Array into its
 * corresponding Number.
 * @param {Uint8Array} buffer
 * @param {number} offset
 * @returns {number}
 */
function get_IEEE754_64Bits(buffer, offset) {
    return new DataView(buffer.buffer).getFloat64(offset);
}
function bytesToNumber(buffer, offset, length) {
    var value = 0;
    for (var i = 0; i < length; i++) {
        value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return value;
}
