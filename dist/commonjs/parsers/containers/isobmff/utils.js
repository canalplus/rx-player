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
exports.parseEmsgBoxes = exports.updateBoxLength = exports.patchPssh = exports.getSegmentsFromSidx = exports.getDurationFromTrun = exports.getTrackFragmentDecodeTime = exports.getPlayReadyKIDFromPrivateData = exports.getMDHDTimescale = exports.getKeyIdFromInitSegment = exports.fakeEncryptionDataInInitSegment = void 0;
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
var AVC1_BOX_NAME = 0x61766331;
var AVC3_BOX_NAME = 0x61766333;
var AC3_BOX_NAME = 0x61632D33;
var EC3_BOX_NAME = 0x65632D33;
var MP4A_BOX_NAME = 0x6D703461;
// XXX TODO move to compat?
/**
 * Fake `sinf` box containing dummy encryption data.
 * @see fakeEncryptionDataInInitSegment
 */
var FAKE_SINF_BOX = new Uint8Array([
    0x00, 0x00, 0x00, 0x50, // Length
    0x73, 0x69, 0x6e, 0x66, // `sinf`
    // -- Start of `frma`
    0x00, 0x00, 0x00, 0x0c, // Length of `frma` box
    0x66, 0x72, 0x6d, 0x61, // `frma`
    0x00, 0x00, 0x00, 0x00, // format in `frma` (empty for now, but will be dynamically
    // updated)
    // -- End of `frma`
    // -- Start of `schm`
    0x00, 0x00, 0x00, 0x14, // Length of `schm` box
    0x73, 0x63, 0x68, 0x6d, // `schm`
    0x00, 0x00, 0x00, 0x00, // This is a ISOBMFF "FullBox" so, there are versions
    // and flags we can just set all of it to `0` here.
    0x63, 0x65, 0x6e, 0x63, // Scheme. Here `cenc`
    0x00, 0x01, 0x00, 0x00, // Version of scheme Here 1.0
    // -- End of `schm`
    // -- Start of `schi`
    0x00, 0x00, 0x00, 0x28, // Length of the `schi` box
    0x73, 0x63, 0x68, 0x69, // `schi`
    // -- Start of `tenc`
    0x00, 0x00, 0x00, 0x20, // Length of the `tenc` box
    0x74, 0x65, 0x6e, 0x63, // `tenc`
    0x00, 0x00, 0x00, 0x00, // This is a ISOBMFF "FullBox" so, there are versions
    // and flags we can just set all of it to `0` here.
    0x00, 0x00, // Reserved bits we can just set to `0`
    0x01, // Default protected
    0x08, // Default per-sample IV size
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Key id. As we just want to create
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // a fake one, we just set all 0s.
    // -- End of `tenc`, `schi` and the whole `sinf`
]);
/**
 * Fake encryption metadata in the given initialization segment to make the
 * browser believe it is handling an encrypted segment.
 *
 * This beautiful mess is needed because multiple user-agents (meaning "browser"
 * in the w3c dialect :p) implementations, mostly those based on PlayReady,
 * poorly handle contents with mixed encrypted and unencrypted contents.
 *
 * By faking encryption information in initialization segments, it seems that
 * most of those problems disappear.
 *
 * Note that this work-around was not found by me, I actually saw it in the
 * shaka-player's code (google's own DASH player) while investigating this issue.
 * So kudos and thanks to them I guess!
 *
 * @param {BufferSource} segment
 * @returns {Uint8Array}
 */
function fakeEncryptionDataInInitSegment(segment) {
    var e_1, _a, e_2, _b;
    var _c;
    // Format it into an Uint8Array
    var buf = segment instanceof Uint8Array ? segment :
        segment instanceof ArrayBuffer ? new Uint8Array(segment) :
            new Uint8Array(segment.buffer);
    /**
     * Contains offsets of all encountered boxes that should be the parents of the
     * box we want to modify. Will be needed later to update their length.
     */
    var parentBoxesOffsets = [];
    // Recuperate those offsets:
    {
        var parentBoxes = [0x6D6F6F76 /* moov */,
            0x7472616B /* trak */,
            0x6D646961 /* mdia */,
            0x6D696E66 /* minf */,
            0x7374626C /* stbl */,
            0x73747364 /* stsd */];
        var currBox = buf;
        var relativeOffset_1 = 0;
        try {
            for (var parentBoxes_1 = __values(parentBoxes), parentBoxes_1_1 = parentBoxes_1.next(); !parentBoxes_1_1.done; parentBoxes_1_1 = parentBoxes_1.next()) {
                var parentBoxName = parentBoxes_1_1.value;
                var offsets = (0, get_box_1.getBoxOffsets)(currBox, parentBoxName);
                if (offsets === null) {
                    return buf;
                }
                currBox = currBox.subarray(offsets[1], offsets[2]);
                parentBoxesOffsets.push(offsets.map(function (offset) { return offset + relativeOffset_1; }));
                relativeOffset_1 += offsets[1];
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (parentBoxes_1_1 && !parentBoxes_1_1.done && (_a = parentBoxes_1.return)) _a.call(parentBoxes_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    var stsdOffsets = parentBoxesOffsets[parentBoxesOffsets.length - 1];
    var stsdSubBoxesStart = stsdOffsets[1] + 8;
    var stsdSubBoxes = buf.subarray(stsdSubBoxesStart, stsdOffsets[2]);
    var encv = (0, get_box_1.getBoxContent)(stsdSubBoxes, 0x656E6376 /* encv */);
    var enca = (0, get_box_1.getBoxContent)(stsdSubBoxes, 0x656E6361 /* enca */);
    if (encv !== null || enca !== null) {
        // There's already encryption data here
        return buf;
    }
    /** Information about every boxes we need to add encryption metadata to. */
    var boxesToUpdate = [
        { type: "video",
            name: AVC1_BOX_NAME,
            relativeOffsets: (0, get_box_1.getBoxOffsets)(stsdSubBoxes, AVC1_BOX_NAME) },
        { type: "video",
            name: AVC3_BOX_NAME,
            relativeOffsets: (0, get_box_1.getBoxOffsets)(stsdSubBoxes, AVC3_BOX_NAME) },
        { type: "audio",
            name: AC3_BOX_NAME,
            relativeOffsets: (0, get_box_1.getBoxOffsets)(stsdSubBoxes, AC3_BOX_NAME) },
        { type: "audio",
            name: EC3_BOX_NAME,
            relativeOffsets: (0, get_box_1.getBoxOffsets)(stsdSubBoxes, EC3_BOX_NAME) },
        { type: "audio",
            name: MP4A_BOX_NAME,
            relativeOffsets: (0, get_box_1.getBoxOffsets)(stsdSubBoxes, MP4A_BOX_NAME) },
        // TODO Does that also covers hvc segments and other rarer codecs?
        // If it doesn't, it needs to be added there.
    ].filter(function (b) { return b.relativeOffsets !== null; });
    // Sort from last to first to simplify length updates
    boxesToUpdate.sort(function (a, b) { return b.relativeOffsets[0] - a.relativeOffsets[0]; });
    /** The segment that will be returned in the end, which will be updated here. */
    var updatedSeg = buf;
    var _loop_1 = function (box) {
        var e_3, _d;
        // Create an Uint8Array which will contain both the previous content of that
        // box and our new fake encryption data
        var boxLen = box.relativeOffsets[2] - box.relativeOffsets[0];
        var newBox = new Uint8Array(boxLen + FAKE_SINF_BOX.length);
        // We put the content of `box` at the beginning. We will replace this box name
        // later, as described in the ISOBMFF spec for encryption metadata.
        var boxContent = stsdSubBoxes.subarray(box.relativeOffsets[0], box.relativeOffsets[2]);
        newBox.set(boxContent, 0);
        /**
         * Offset where the initial box's title is in `newBox`.
         * We prefer starting at the content offset and then descending 4 bytes
         * instead of going from the start, because here names are always 4 bytes
         * though length may technically be expressed in more than 4.
         */
        var titleOffsetForBox = box.relativeOffsets[1] - box.relativeOffsets[0] - 4;
        if (box.type === "audio") {
            // Put "enca" in place of original box name, as indicated by
            // `8.12 Support for Protected Streams` of ISO/IEC 14496-12
            newBox.set((0, byte_parsing_1.itobe4)(0x656E6361), titleOffsetForBox);
        }
        else {
            // Put "encv" in place of original box name, as indicated by
            // `8.12 Support for Protected Streams` of ISO/IEC 14496-12
            newBox.set((0, byte_parsing_1.itobe4)(0x656E6376), titleOffsetForBox);
        }
        newBox.set(FAKE_SINF_BOX, boxLen); // Put our fake box after
        var sinfOffsets = (0, get_box_1.getBoxOffsets)(newBox, 0x73696E66 /* sinf */);
        if (sinfOffsets === null) {
            log_1.default.warn("ISOBMFF: sinf not found, this should not be possible.");
            return { value: buf };
        }
        var sinfContent = newBox.subarray(sinfOffsets[1], sinfOffsets[2]);
        var frmaOffsets = (_c = (0, get_box_1.getBoxOffsets)(sinfContent, 0x66726D61 /* frma */)) === null || _c === void 0 ? void 0 : _c.map(function (val) { return val + sinfOffsets[1]; });
        if (frmaOffsets === undefined) {
            log_1.default.warn("ISOBMFF: frma not found in sinf, this should not be possible.");
            return { value: buf };
        }
        // Put original box name as value of frma, again as indicated by the spec
        newBox.set((0, byte_parsing_1.itobe4)(box.name), frmaOffsets[1]);
        newBox = updateBoxLength(newBox);
        var previousUpdatedSeg = updatedSeg;
        // Grow the segment we work with to include our new box, we will update it just after.
        updatedSeg = new Uint8Array(previousUpdatedSeg.length + newBox.byteLength);
        // For Xbox One, we cut and insert at the start of the source box.  For
        // other platforms, we cut and insert at the end of the source box.  It's
        // not clear why this is necessary on Xbox One, but it seems to be evidence
        // of another bug in the firmware implementation of MediaSource & EME.
        // XXX TODO
        // const cutPoint = shaka.util.Platform.isXkboxOne() ?
        //     sourceBox.start :
        //     sourceBox.start + sourceBox.size;
        /**
         * The absolute end offset of `box` in the init segment given originally.
         *
         * We can still rely on that original value because we're iterating on inner
         * boxes in a reverse order. Thus, we are never moving further not-yet processed
         * boxes.
         */
        var absoluteBoxEnd = stsdSubBoxesStart + box.relativeOffsets[2];
        // Let everything coming before `box` as is (for now, lengths will be updated later).
        updatedSeg.set(previousUpdatedSeg.subarray(0, absoluteBoxEnd), 0);
        // Move everything from end of `box` to the end of the bigger segment, so
        // the new box can be put before
        updatedSeg.set(previousUpdatedSeg.subarray(absoluteBoxEnd), absoluteBoxEnd + newBox.length);
        // and put the new box in between
        updatedSeg.set(newBox, absoluteBoxEnd);
        try {
            // The parents up the chain from the encryption metadata box need their
            // sizes adjusted to account for the added box. These offsets should not be
            // changed, because they should all be within the first section we copy.
            for (var parentBoxesOffsets_1 = (e_3 = void 0, __values(parentBoxesOffsets)), parentBoxesOffsets_1_1 = parentBoxesOffsets_1.next(); !parentBoxesOffsets_1_1.done; parentBoxesOffsets_1_1 = parentBoxesOffsets_1.next()) {
                var parentBoxesOffset = parentBoxesOffsets_1_1.value;
                var parentBox = updatedSeg.subarray(parentBoxesOffset[0], parentBoxesOffset[2] + newBox.length);
                // TODO This will break if `updateBoxLength` actually needs to create a
                // new box, for example because it might have to create an enlarged length
                // box if it cannot be expressed in 32 bits.
                // This is however very very rare (never actually seen?), and it
                // represents much more work, so I just don't care for now.
                updateBoxLength(parentBox);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (parentBoxesOffsets_1_1 && !parentBoxesOffsets_1_1.done && (_d = parentBoxesOffsets_1.return)) _d.call(parentBoxesOffsets_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        var nbStsdEntries = (0, byte_parsing_1.be2toi)(updatedSeg, stsdOffsets[1] + 6);
        nbStsdEntries += 1;
        updatedSeg.set((0, byte_parsing_1.itobe2)(nbStsdEntries), stsdOffsets[1] + 6);
    };
    try {
        for (var boxesToUpdate_1 = __values(boxesToUpdate), boxesToUpdate_1_1 = boxesToUpdate_1.next(); !boxesToUpdate_1_1.done; boxesToUpdate_1_1 = boxesToUpdate_1.next()) {
            var box = boxesToUpdate_1_1.value;
            var state_1 = _loop_1(box);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (boxesToUpdate_1_1 && !boxesToUpdate_1_1.done && (_b = boxesToUpdate_1.return)) _b.call(boxesToUpdate_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return updatedSeg;
}
exports.fakeEncryptionDataInInitSegment = fakeEncryptionDataInInitSegment;
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
    var e_4, _a;
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
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (trafs_1_1 && !trafs_1_1.done && (_a = trafs_1.return)) _a.call(trafs_1);
        }
        finally { if (e_4) throw e_4.error; }
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
    return tenc.subarray(8, 24);
}
exports.getKeyIdFromInitSegment = getKeyIdFromInitSegment;
