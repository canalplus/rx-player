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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
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
exports.parseEmsgBoxes = exports.updateBoxLength = exports.patchPssh = exports.getSegmentsFromSidx = exports.getDurationFromTrun = exports.getTrackFragmentDecodeTime = exports.getPlayReadyKIDFromPrivateData = exports.getMDHDTimescale = exports.getKeyIdFromInitSegment = void 0;
var log_1 = require("../../../log");
var assert_1 = require("../../../utils/assert");
var byte_parsing_1 = require("../../../utils/byte_parsing");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var string_parsing_1 = require("../../../utils/string_parsing");
var constants_1 = require("./constants");
var create_box_1 = require("./create_box");
var drm_1 = require("./drm");
Object.defineProperty(exports, "getPlayReadyKIDFromPrivateData", { enumerable: true, get: function () { return drm_1.getPlayReadyKIDFromPrivateData; } });
var get_box_1 = require("./get_box");
var read_1 = require("./read");
/**
 * Parse the sidx part (segment index) of an ISOBMFF buffer and construct a
 * corresponding Array of available segments.
 *
 * Returns `null` if not found.
 * @param {Uint8Array} buf
 * @param {Number} sidxOffsetInWholeSegment
 * @returns {Object|null} {Array.<Object>} - Information about each subsegment.
 */
function getSegmentsFromSidx(buf, sidxOffsetInWholeSegment) {
    var sidxOffsets = (0, get_box_1.getBoxOffsets)(buf, 0x73696478 /* "sidx" */);
    if (sidxOffsets === null) {
        return null;
    }
    var offset = sidxOffsetInWholeSegment;
    var boxSize = sidxOffsets[2] - sidxOffsets[0];
    var cursor = sidxOffsets[1];
    /* version(8) */
    /* flags(24) */
    /* reference_ID(32); */
    /* timescale(32); */
    var version = buf[cursor];
    cursor += 4 + 4;
    var timescale = (0, byte_parsing_1.be4toi)(buf, cursor);
    cursor += 4;
    /* earliest_presentation_time(32 / 64) */
    /* first_offset(32 / 64) */
    var time;
    if (version === 0) {
        time = (0, byte_parsing_1.be4toi)(buf, cursor);
        cursor += 4;
        offset += (0, byte_parsing_1.be4toi)(buf, cursor) + boxSize;
        cursor += 4;
    }
    else if (version === 1) {
        time = (0, byte_parsing_1.be8toi)(buf, cursor);
        cursor += 8;
        offset += (0, byte_parsing_1.be8toi)(buf, cursor) + boxSize;
        cursor += 8;
    }
    else {
        return null;
    }
    var segments = [];
    /* reserved(16) */
    /* reference_count(16) */
    cursor += 2;
    var count = (0, byte_parsing_1.be2toi)(buf, cursor);
    cursor += 2;
    while (--count >= 0) {
        /* reference_type(1) */
        /* reference_size(31) */
        /* segment_duration(32) */
        /* sap..(32) */
        var refChunk = (0, byte_parsing_1.be4toi)(buf, cursor);
        cursor += 4;
        var refType = (refChunk & 0x80000000) >>> 31;
        var refSize = refChunk & 0x7fffffff;
        // when set to 1 indicates that the reference is to a sidx, else to media
        if (refType === 1) {
            throw new Error("sidx with reference_type `1` not yet implemented");
        }
        var duration = (0, byte_parsing_1.be4toi)(buf, cursor);
        cursor += 4;
        // let sapChunk = be4toi(buf, cursor + 8);
        cursor += 4;
        // TODO(pierre): handle sap
        // let startsWithSap = (sapChunk & 0x80000000) >>> 31;
        // let sapType = (sapChunk & 0x70000000) >>> 28;
        // let sapDelta = sapChunk & 0x0FFFFFFF;
        segments.push({
            time: time,
            duration: duration,
            timescale: timescale,
            range: [offset, offset + refSize - 1],
        });
        time += duration;
        offset += refSize;
    }
    return segments;
}
exports.getSegmentsFromSidx = getSegmentsFromSidx;
/**
 * Parse track Fragment Decode Time to get a precize initial time for this
 * segment (in the media timescale).
 *
 * Stops at the first tfdt encountered from the beginning of the file.
 * Returns this time.
 * `undefined` if not found.
 * @param {Uint8Array} buffer
 * @returns {Number | undefined}
 */
function getTrackFragmentDecodeTime(buffer) {
    var traf = (0, read_1.getTRAF)(buffer);
    if (traf === null) {
        return undefined;
    }
    var tfdt = (0, get_box_1.getBoxContent)(traf, 0x74666474 /* tfdt */);
    if (tfdt === null) {
        return undefined;
    }
    var version = tfdt[0];
    if (version === 1) {
        return (0, byte_parsing_1.be8toi)(tfdt, 4);
    }
    if (version === 0) {
        return (0, byte_parsing_1.be4toi)(tfdt, 4);
    }
    return undefined;
}
exports.getTrackFragmentDecodeTime = getTrackFragmentDecodeTime;
/**
 * Returns the "default sample duration" which is the default value for duration
 * of samples found in a "traf" ISOBMFF box.
 *
 * Returns `undefined` if no "default sample duration" has been found.
 * @param {Uint8Array} traf
 * @returns {number|undefined}
 */
function getDefaultDurationFromTFHDInTRAF(traf) {
    var tfhd = (0, get_box_1.getBoxContent)(traf, 0x74666864 /* tfhd */);
    if (tfhd === null) {
        return undefined;
    }
    var cursor = /* version */ 1;
    var flags = (0, byte_parsing_1.be3toi)(tfhd, cursor);
    cursor += 3;
    var hasBaseDataOffset = (flags & 0x000001) > 0;
    var hasSampleDescriptionIndex = (flags & 0x000002) > 0;
    var hasDefaultSampleDuration = (flags & 0x000008) > 0;
    if (!hasDefaultSampleDuration) {
        return undefined;
    }
    cursor += 4;
    if (hasBaseDataOffset) {
        cursor += 8;
    }
    if (hasSampleDescriptionIndex) {
        cursor += 4;
    }
    var defaultDuration = (0, byte_parsing_1.be4toi)(tfhd, cursor);
    return defaultDuration;
}
/**
 * Calculate segment duration approximation by additioning the duration from
 * every samples in a trun ISOBMFF box.
 *
 * Returns `undefined` if we could not parse the duration.
 * @param {Uint8Array} buffer
 * @returns {number | undefined}
 */
function getDurationFromTrun(buffer) {
    var e_1, _a;
    var trafs = (0, read_1.getTRAFs)(buffer);
    if (trafs.length === 0) {
        return undefined;
    }
    var completeDuration = 0;
    try {
        for (var trafs_1 = __values(trafs), trafs_1_1 = trafs_1.next(); !trafs_1_1.done; trafs_1_1 = trafs_1.next()) {
            var traf = trafs_1_1.value;
            var trun = (0, get_box_1.getBoxContent)(traf, 0x7472756e /* trun */);
            if (trun === null) {
                return undefined;
            }
            var cursor = 0;
            var version = trun[cursor];
            cursor += 1;
            if (version > 1) {
                return undefined;
            }
            var flags = (0, byte_parsing_1.be3toi)(trun, cursor);
            cursor += 3;
            var hasSampleDuration = (flags & 0x000100) > 0;
            var defaultDuration = 0;
            if (!hasSampleDuration) {
                defaultDuration = getDefaultDurationFromTFHDInTRAF(traf);
                if (defaultDuration === undefined) {
                    return undefined;
                }
            }
            var hasDataOffset = (flags & 0x000001) > 0;
            var hasFirstSampleFlags = (flags & 0x000004) > 0;
            var hasSampleSize = (flags & 0x000200) > 0;
            var hasSampleFlags = (flags & 0x000400) > 0;
            var hasSampleCompositionOffset = (flags & 0x000800) > 0;
            var sampleCounts = (0, byte_parsing_1.be4toi)(trun, cursor);
            cursor += 4;
            if (hasDataOffset) {
                cursor += 4;
            }
            if (hasFirstSampleFlags) {
                cursor += 4;
            }
            var i = sampleCounts;
            var duration = 0;
            while (i-- > 0) {
                if (hasSampleDuration) {
                    duration += (0, byte_parsing_1.be4toi)(trun, cursor);
                    cursor += 4;
                }
                else {
                    duration += defaultDuration;
                }
                if (hasSampleSize) {
                    cursor += 4;
                }
                if (hasSampleFlags) {
                    cursor += 4;
                }
                if (hasSampleCompositionOffset) {
                    cursor += 4;
                }
            }
            completeDuration += duration;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (trafs_1_1 && !trafs_1_1.done && (_a = trafs_1.return)) _a.call(trafs_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return completeDuration;
}
exports.getDurationFromTrun = getDurationFromTrun;
/**
 * Get timescale information from a movie header box. Found in init segments.
 * `undefined` if not found or not parsed.
 *
 * This timescale is the default timescale used for segments.
 * @param {Uint8Array} buffer
 * @returns {Number | undefined}
 */
function getMDHDTimescale(buffer) {
    var mdia = (0, read_1.getMDIA)(buffer);
    if (mdia === null) {
        return undefined;
    }
    var mdhd = (0, get_box_1.getBoxContent)(mdia, 0x6d646864 /* "mdhd" */);
    if (mdhd === null) {
        return undefined;
    }
    var cursor = 0;
    var version = mdhd[cursor];
    cursor += 4;
    if (version === 1) {
        return (0, byte_parsing_1.be4toi)(mdhd, cursor + 16);
    }
    else if (version === 0) {
        return (0, byte_parsing_1.be4toi)(mdhd, cursor + 8);
    }
    return undefined;
}
exports.getMDHDTimescale = getMDHDTimescale;
/**
 * Creates a PSSH box with the given systemId and data.
 * @param {Array.<Object>} psshInfo
 * @returns {Uint8Array}
 */
function createPssh(_a) {
    var systemId = _a.systemId, privateData = _a.privateData;
    var _systemId = systemId.replace(/-/g, "");
    (0, assert_1.default)(_systemId.length === 32);
    return (0, create_box_1.createBox)("pssh", (0, byte_parsing_1.concat)(4, // 4 initial zeroed bytes
    (0, string_parsing_1.hexToBytes)(_systemId), (0, byte_parsing_1.itobe4)(privateData.length), privateData));
}
/**
 * Update ISOBMFF given to add a "pssh" box in the "moov" box for every content
 * protection in the psshList array given.
 * @param {Uint8Array} buf - the ISOBMFF file
 * @param {Array.<Object>} psshList
 * @returns {Uint8Array} - The new ISOBMFF generated.
 */
function patchPssh(buf, psshList) {
    if ((0, is_null_or_undefined_1.default)(psshList) || psshList.length === 0) {
        return buf;
    }
    var moovOffsets = (0, get_box_1.getBoxOffsets)(buf, 0x6d6f6f76 /* = "moov" */);
    if (moovOffsets === null) {
        return buf;
    }
    var moov = buf.subarray(moovOffsets[0], moovOffsets[2]);
    var moovArr = [moov];
    for (var i = 0; i < psshList.length; i++) {
        moovArr.push(createPssh(psshList[i]));
    }
    var newmoov = updateBoxLength(byte_parsing_1.concat.apply(void 0, __spreadArray([], __read(moovArr), false)));
    return (0, byte_parsing_1.concat)(buf.subarray(0, moovOffsets[0]), newmoov, buf.subarray(moovOffsets[2]));
}
exports.patchPssh = patchPssh;
/**
 * Returns a new version of the given box with the size updated
 * so it reflects its actual size.
 *
 * You can use this function after modifying a ISOBMFF box so its size is
 * updated.
 *
 * /!\ Please consider that this function might mutate the given Uint8Array
 * in place or might create a new one, depending on the current conditions.
 * @param {Uint8Array} buf - The ISOBMFF box
 * @returns {Uint8Array}
 */
function updateBoxLength(buf) {
    var newLen = buf.length;
    if (newLen < 4) {
        throw new Error("Cannot update box length: box too short");
    }
    var oldSize = (0, byte_parsing_1.be4toi)(buf, 0);
    if (oldSize === 0) {
        if (newLen > constants_1.MAX_32_BIT_INT) {
            var newBox = new Uint8Array(newLen + 8);
            newBox.set((0, byte_parsing_1.itobe4)(1), 0);
            newBox.set(buf.subarray(4, 8), 4);
            newBox.set((0, byte_parsing_1.itobe8)(newLen + 8), 8);
            newBox.set(buf.subarray(8, newLen), 16);
            return newBox;
        }
        else {
            buf.set((0, byte_parsing_1.itobe4)(newLen), 0);
            return buf;
        }
    }
    else if (oldSize === 1) {
        if (newLen < 16) {
            throw new Error("Cannot update box length: box too short");
        }
        buf.set((0, byte_parsing_1.itobe8)(newLen), 8);
        return buf;
    }
    else if (newLen <= constants_1.MAX_32_BIT_INT) {
        buf.set((0, byte_parsing_1.itobe4)(newLen), 0);
        return buf;
    }
    else {
        var newBox = new Uint8Array(newLen + 8);
        newBox.set((0, byte_parsing_1.itobe4)(1), 0);
        newBox.set(buf.subarray(4, 8), 4);
        newBox.set((0, byte_parsing_1.itobe8)(newLen + 8), 8);
        newBox.set(buf.subarray(8, newLen), 16);
        return newBox;
    }
}
exports.updateBoxLength = updateBoxLength;
/**
 * Parse EMSG boxes from ISOBMFF data.
 * @param {Uint8Array} buffer
 * @returns {Array.<Object> | undefined}
 */
function parseEmsgBoxes(buffer) {
    var emsgs = [];
    var offset = 0;
    while (offset < buffer.length) {
        var emsg = (0, read_1.getEMSG)(buffer, offset);
        if (emsg === null) {
            break;
        }
        var length_1 = emsg.length;
        offset += length_1;
        var version = emsg[0];
        if (version !== 0) {
            log_1.default.warn("ISOBMFF: EMSG version " + version.toString() + " not supported.");
        }
        else {
            var position = 4; // skip version + flags
            var _a = (0, string_parsing_1.readNullTerminatedString)(emsg, position), schemeIdEnd = _a.end, schemeIdUri = _a.string;
            position = schemeIdEnd; // skip schemeIdUri
            var _b = (0, string_parsing_1.readNullTerminatedString)(emsg, position), valueEnd = _b.end, value = _b.string;
            position = valueEnd; // skip value
            var timescale = (0, byte_parsing_1.be4toi)(emsg, position);
            position += 4; // skip timescale
            var presentationTimeDelta = (0, byte_parsing_1.be4toi)(emsg, position);
            position += 4; // skip presentationTimeDelta
            var eventDuration = (0, byte_parsing_1.be4toi)(emsg, position);
            position += 4; // skip eventDuration
            var id = (0, byte_parsing_1.be4toi)(emsg, position);
            position += 4; // skip id
            var messageData = emsg.subarray(position, length_1);
            var emsgData = {
                schemeIdUri: schemeIdUri,
                value: value,
                timescale: timescale,
                presentationTimeDelta: presentationTimeDelta,
                eventDuration: eventDuration,
                id: id,
                messageData: messageData,
            };
            emsgs.push(emsgData);
        }
    }
    if (emsgs.length === 0) {
        return undefined;
    }
    return emsgs;
}
exports.parseEmsgBoxes = parseEmsgBoxes;
/**
 * @param {Uint8Array} segment
 * @returns {Uint8Array|null}
 */
function getKeyIdFromInitSegment(segment) {
    var stsd = (0, get_box_1.getChildBox)(segment, [
        0x6d6f6f76 /* moov */, 0x7472616b /* trak */, 0x6d646961 /* mdia */,
        0x6d696e66 /* minf */, 0x7374626c /* stbl */, 0x73747364 /* stsd */,
    ]);
    if (stsd === null) {
        return null;
    }
    var stsdSubBoxes = stsd.subarray(8);
    var encBox = (0, get_box_1.getBoxContent)(stsdSubBoxes, 0x656e6376 /* encv */);
    var encContentOffset = 0;
    if (encBox === null) {
        encContentOffset =
            8 + // sample entry header
                8 + // reserved
                2 + // channelcount
                2 + // samplesize
                2 + // predefined
                2 + // reserved
                4; // samplerate
        encBox = (0, get_box_1.getBoxContent)(stsdSubBoxes, 0x656e6361 /* enca */);
    }
    else {
        encContentOffset =
            8 + // sample entry header
                2 +
                2 +
                12 + // predefined + reserved + predefined
                2 +
                2 + // width + height
                4 +
                4 + // horizresolution + vertresolution
                4 + // reserved
                2 + // frame_count
                32 +
                2 + // depth
                2; // pre-defined;
    }
    if (encBox === null) {
        // There's no encryption data here
        return null;
    }
    var tenc = (0, get_box_1.getChildBox)(encBox.subarray(encContentOffset), [0x73696e66 /* sinf */, 0x73636869 /* schi */, 0x74656e63 /* tenc */]);
    if (tenc === null || tenc.byteLength < 24) {
        return null;
    }
    var keyId = tenc.subarray(8, 24);
    // Zero-filled keyId should only be valid for unencrypted content
    return keyId.every(function (b) { return b === 0; }) ? null : keyId;
}
exports.getKeyIdFromInitSegment = getKeyIdFromInitSegment;
