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
import log from "../../../log";
const SEGMENT_ID = 0x18538067;
const INFO_ID = 0x1549a966;
const TIMECODESCALE_ID = 0x2ad7b1;
const DURATION_ID = 0x4489;
const CUES_ID = 0x1c53bb6b;
const CUE_POINT_ID = 0xbb;
const CUE_TIME_ID = 0xb3;
const CUE_TRACK_POSITIONS_ID = 0xb7;
const CUE_CLUSTER_POSITIONS_ID = 0xf1;
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
function findNextElement(elementID, parents, buffer, [initialOffset, maxOffset]) {
    let currentOffset = initialOffset;
    while (currentOffset < maxOffset) {
        const parsedID = getEBMLID(buffer, currentOffset);
        if (parsedID === null) {
            return null;
        }
        const { value: ebmlTagID, length: ebmlTagLength } = parsedID;
        const sizeOffset = currentOffset + ebmlTagLength;
        const parsedValue = getEBMLValue(buffer, sizeOffset);
        if (parsedValue === null) {
            return null;
        }
        const { length: valueLengthLength, value: valueLength } = parsedValue;
        const valueOffset = sizeOffset + valueLengthLength;
        const valueEndOffset = valueOffset + valueLength;
        if (ebmlTagID === elementID) {
            return [valueOffset, valueEndOffset];
        }
        else if (parents.length > 0) {
            for (let i = 0; i < parents.length; i++) {
                if (ebmlTagID === parents[i]) {
                    const newParents = parents.slice(i + 1, parents.length);
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
export function getTimeCodeScale(buffer, initialOffset) {
    const timeCodeScaleOffsets = findNextElement(TIMECODESCALE_ID, [SEGMENT_ID, INFO_ID], buffer, [initialOffset, buffer.length]);
    if (timeCodeScaleOffsets === null) {
        return null;
    }
    const length = timeCodeScaleOffsets[1] - timeCodeScaleOffsets[0];
    return 1e9 / bytesToNumber(buffer, timeCodeScaleOffsets[0], length);
}
/**
 * Return the duration of the concerned media.
 * @param {Uint8Array} buffer
 * @param {number} initialOffset
 * @returns {number|null}
 */
function getDuration(buffer, initialOffset) {
    const timeCodeScaleOffsets = findNextElement(DURATION_ID, [SEGMENT_ID, INFO_ID], buffer, [initialOffset, buffer.length]);
    if (timeCodeScaleOffsets === null) {
        return null;
    }
    const length = timeCodeScaleOffsets[1] - timeCodeScaleOffsets[0];
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
export function getSegmentsFromCues(buffer, initialOffset) {
    const segmentRange = findNextElement(SEGMENT_ID, [], buffer, [
        initialOffset,
        buffer.length,
    ]);
    if (segmentRange === null) {
        return null;
    }
    const [segmentRangeStart, segmentRangeEnd] = segmentRange;
    const timescale = getTimeCodeScale(buffer, segmentRangeStart);
    if (timescale === null) {
        return null;
    }
    const duration = getDuration(buffer, segmentRangeStart);
    if (duration === null) {
        return null;
    }
    const cuesRange = findNextElement(CUES_ID, [], buffer, [
        segmentRangeStart,
        segmentRangeEnd,
    ]);
    if (cuesRange === null) {
        return null;
    }
    const rawInfos = [];
    let currentOffset = cuesRange[0];
    while (currentOffset < cuesRange[1]) {
        const cuePointRange = findNextElement(CUE_POINT_ID, [], buffer, [
            currentOffset,
            cuesRange[1],
        ]);
        if (cuePointRange === null) {
            break;
        }
        const cueTimeRange = findNextElement(CUE_TIME_ID, [], buffer, [
            cuePointRange[0],
            cuePointRange[1],
        ]);
        if (cueTimeRange === null) {
            return null;
        }
        const time = bytesToNumber(buffer, cueTimeRange[0], cueTimeRange[1] - cueTimeRange[0]);
        const cueOffsetRange = findNextElement(CUE_CLUSTER_POSITIONS_ID, [CUE_TRACK_POSITIONS_ID], buffer, [cuePointRange[0], cuePointRange[1]]);
        if (cueOffsetRange === null) {
            return null;
        }
        const rangeStart = bytesToNumber(buffer, cueOffsetRange[0], cueOffsetRange[1] - cueOffsetRange[0]) +
            segmentRangeStart;
        rawInfos.push({ time, rangeStart });
        currentOffset = cuePointRange[1];
    }
    const segments = [];
    for (let i = 0; i < rawInfos.length; i++) {
        const currentSegment = rawInfos[i];
        if (i === rawInfos.length - 1) {
            segments.push({
                time: currentSegment.time,
                timescale,
                duration: i === 0 ? duration : duration - currentSegment.time,
                range: [currentSegment.rangeStart, Infinity],
            });
        }
        else {
            segments.push({
                time: currentSegment.time,
                timescale,
                duration: rawInfos[i + 1].time - currentSegment.time,
                range: [currentSegment.rangeStart, rawInfos[i + 1].rangeStart - 1],
            });
        }
    }
    return segments;
}
function getLength(buffer, offset) {
    for (let length = 1; length <= 8; length++) {
        if (buffer[offset] >= Math.pow(2, 8 - length)) {
            return length;
        }
    }
    return undefined;
}
function getEBMLID(buffer, offset) {
    const length = getLength(buffer, offset);
    if (length === undefined) {
        log.warn("webm: unrepresentable length");
        return null;
    }
    if (offset + length > buffer.length) {
        log.warn("webm: impossible length");
        return null;
    }
    let value = 0;
    for (let i = 0; i < length; i++) {
        value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return { length, value };
}
function getEBMLValue(buffer, offset) {
    const length = getLength(buffer, offset);
    if (length === undefined) {
        log.warn("webm: unrepresentable length");
        return null;
    }
    if (offset + length > buffer.length) {
        log.warn("webm: impossible length");
        return null;
    }
    let value = (buffer[offset] & ((1 << (8 - length)) - 1)) * Math.pow(2, (length - 1) * 8);
    for (let i = 1; i < length; i++) {
        value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return { length, value };
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
    let value = 0;
    for (let i = 0; i < length; i++) {
        value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return value;
}
