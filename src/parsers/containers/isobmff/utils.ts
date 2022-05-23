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
import assert from "../../../utils/assert";
import {
  be2toi,
  be3toi,
  be4toi,
  be8toi,
  concat,
  itobe2,
  itobe4,
  itobe8,
} from "../../../utils/byte_parsing";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import { hexToBytes, readNullTerminatedString } from "../../../utils/string_parsing";
import { MAX_32_BIT_INT } from "./constants";
import { createBox } from "./create_box";
import { getPlayReadyKIDFromPrivateData } from "./drm";
import { getBoxContent, getBoxOffsets, getChildBox } from "./get_box";
import { getEMSG, getMDIA, getTRAF, getTRAFs } from "./read";

const AVC1_BOX_NAME = 0x61766331;
const AVC3_BOX_NAME = 0x61766333;
const AC3_BOX_NAME = 0x61632D33;
const EC3_BOX_NAME = 0x65632D33;
const MP4A_BOX_NAME = 0x6D703461;

/** Information related to a PSSH box. */
export interface IISOBMFFPSSHInfo {
  /** Corresponding DRM's system ID, as an hexadecimal string. */
  systemId: string;
  /** Additional data contained in the PSSH Box. */
  privateData: Uint8Array;
}

// XXX TODO move to compat?
/**
 * Fake `sinf` box containing dummy encryption data.
 * @see fakeEncryptionDataInInitSegment
 */
const FAKE_SINF_BOX = new Uint8Array([
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
  0x00, 0x00,             // Reserved bits we can just set to `0`
  0x01,                   // Default protected
  0x08,                   // Default per-sample IV size
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
export function fakeEncryptionDataInInitSegment(
  segment : BufferSource
) : Uint8Array {
  // Format it into an Uint8Array
  const buf = segment instanceof Uint8Array ?  segment :
              segment instanceof ArrayBuffer ? new Uint8Array(segment) :
                                               new Uint8Array(segment.buffer);

  /**
   * Contains offsets of all encountered boxes that should be the parents of the
   * box we want to modify. Will be needed later to update their length.
   */
  const parentBoxesOffsets = [];

  // Recuperate those offsets:
  {
    const parentBoxes = [ 0x6D6F6F76 /* moov */,
                          0x7472616B /* trak */,
                          0x6D646961 /* mdia */,
                          0x6D696E66 /* minf */,
                          0x7374626C /* stbl */,
                          0x73747364 /* stsd */];
    let currBox = buf;
    let relativeOffset = 0;
    for (const parentBoxName of parentBoxes) {
      const offsets = getBoxOffsets(currBox, parentBoxName);
      if (offsets === null) {
        return buf;
      }
      currBox = currBox.subarray(offsets[1], offsets[2]);
      parentBoxesOffsets.push(offsets.map(offset => offset + relativeOffset));
      relativeOffset += offsets[1];
    }
  }

  const stsdOffsets = parentBoxesOffsets[parentBoxesOffsets.length - 1];
  const stsdSubBoxesStart = stsdOffsets[1] + 8;
  const stsdSubBoxes = buf.subarray(stsdSubBoxesStart, stsdOffsets[2]);
  const encv = getBoxContent(stsdSubBoxes, 0x656E6376 /* encv */);
  const enca = getBoxContent(stsdSubBoxes, 0x656E6361 /* enca */);
  if (encv !== null || enca !== null) {
    // There's already encryption data here
    return buf;
  }

  interface ISampleEntryBoxInfo {
    /** Whether the corresponding box is for audio or video data. */
    type: "audio" | "video";

    /** Name of the parsed box. */
    name: number;

    /**
     * Offsets in bytes, relative to the first inner box of the parent
     * `stsd` box.
     * The first number indicates the offset of the first byte from
     * that box, the second, the offset of the data (after the size and
     * name of the box), and the third: the end - not included - of the
     * box.
     */
    relativeOffsets: [number, number, number];
  }

  /** Information about every boxes we need to add encryption metadata to. */
  const boxesToUpdate : ISampleEntryBoxInfo[] = [
    { type: "video" as const,
      name: AVC1_BOX_NAME,
      relativeOffsets: getBoxOffsets(stsdSubBoxes, AVC1_BOX_NAME) },
    { type: "video" as const,
      name: AVC3_BOX_NAME,
      relativeOffsets: getBoxOffsets(stsdSubBoxes, AVC3_BOX_NAME) },
    { type: "audio" as const,
      name: AC3_BOX_NAME,
      relativeOffsets: getBoxOffsets(stsdSubBoxes, AC3_BOX_NAME) },
    { type: "audio" as const,
      name: EC3_BOX_NAME,
      relativeOffsets: getBoxOffsets(stsdSubBoxes, EC3_BOX_NAME) },
    { type: "audio" as const,
      name: MP4A_BOX_NAME,
      relativeOffsets: getBoxOffsets(stsdSubBoxes, MP4A_BOX_NAME) },
    // TODO Does that also covers hvc segments and other rarer codecs?
    // If it doesn't, it needs to be added there.
  ].filter((b) : b is ISampleEntryBoxInfo => b.relativeOffsets !== null);

  // Sort from last to first to simplify length updates
  boxesToUpdate.sort((a, b) => b.relativeOffsets[0] - a.relativeOffsets[0]);

  /** The segment that will be returned in the end, which will be updated here. */
  let updatedSeg = buf;
  for (const box of boxesToUpdate) {
    // Create an Uint8Array which will contain both the previous content of that
    // box and our new fake encryption data
    const boxLen = box.relativeOffsets[2] - box.relativeOffsets[0];
    let newBox = new Uint8Array(boxLen + FAKE_SINF_BOX.length);

    // We put the content of `box` at the beginning. We will replace this box name
    // later, as described in the ISOBMFF spec for encryption metadata.
    const boxContent = stsdSubBoxes.subarray(box.relativeOffsets[0],
                                             box.relativeOffsets[2]);
    newBox.set(boxContent, 0);

    /**
     * Offset where the initial box's title is in `newBox`.
     * We prefer starting at the content offset and then descending 4 bytes
     * instead of going from the start, because here names are always 4 bytes
     * though length may technically be expressed in more than 4.
     */
    const titleOffsetForBox = box.relativeOffsets[1] - box.relativeOffsets[0] - 4;
    if (box.type === "audio") {
      // Put "enca" in place of original box name, as indicated by
      // `8.12 Support for Protected Streams` of ISO/IEC 14496-12
      newBox.set(itobe4(0x656E6361), titleOffsetForBox);
    } else {
      // Put "encv" in place of original box name, as indicated by
      // `8.12 Support for Protected Streams` of ISO/IEC 14496-12
      newBox.set(itobe4(0x656E6376), titleOffsetForBox);
    }
    newBox.set(FAKE_SINF_BOX, boxLen); // Put our fake box after

    const sinfOffsets = getBoxOffsets(newBox, 0x73696E66 /* sinf */);
    if (sinfOffsets === null) {
      log.warn("ISOBMFF: sinf not found, this should not be possible.");
      return buf;
    }
    const sinfContent = newBox.subarray(sinfOffsets[1], sinfOffsets[2]);
    const frmaOffsets = getBoxOffsets(sinfContent, 0x66726D61 /* frma */)
      ?.map(val => val + sinfOffsets[1]);
    if (frmaOffsets === undefined) {
      log.warn("ISOBMFF: frma not found in sinf, this should not be possible.");
      return buf;
    }

    // Put original box name as value of frma, again as indicated by the spec
    newBox.set(itobe4(box.name), frmaOffsets[1]);
    newBox = updateBoxLength(newBox);

    const previousUpdatedSeg = updatedSeg;

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
    const absoluteBoxEnd = stsdSubBoxesStart + box.relativeOffsets[2];

    // Let everything coming before `box` as is (for now, lengths will be updated later).
    updatedSeg.set(previousUpdatedSeg.subarray(0, absoluteBoxEnd), 0);

    // Move everything from end of `box` to the end of the bigger segment, so
    // the new box can be put before
    updatedSeg.set(previousUpdatedSeg.subarray(absoluteBoxEnd),
                   absoluteBoxEnd + newBox.length);

    // and put the new box in between
    updatedSeg.set(newBox, absoluteBoxEnd);

    // The parents up the chain from the encryption metadata box need their
    // sizes adjusted to account for the added box. These offsets should not be
    // changed, because they should all be within the first section we copy.
    for (const parentBoxesOffset of parentBoxesOffsets) {
      const parentBox = updatedSeg.subarray(parentBoxesOffset[0],
                                            parentBoxesOffset[2] + newBox.length);

      // TODO This will break if `updateBoxLength` actually needs to create a
      // new box, for example because it might have to create an enlarged length
      // box if it cannot be expressed in 32 bits.
      // This is however very very rare (never actually seen?), and it
      // represents much more work, so I just don't care for now.
      updateBoxLength(parentBox);
    }

    let nbStsdEntries = be2toi(updatedSeg, stsdOffsets[1] + 6);
    nbStsdEntries += 1;
    updatedSeg.set(itobe2(nbStsdEntries), stsdOffsets[1] + 6);
  }

  return updatedSeg;
}

/**
 * Inband event data when the data was contained inside an ISOBMFF box.
 * The value and their name corresponds to the same one than in the
 * corresponding ISOBMFF specification.
 */
export interface IEMSG {
  schemeIdUri: string;
  value: string;
  timescale: number;
  presentationTimeDelta: number;
  eventDuration: number;
  id: number;
  messageData: Uint8Array;
}

/** Segment information from a parsed sidx. */
export interface ISidxSegment {
  /** This segment start time, timescaled. */
  time: number;
  /** This segment difference between its end and start time, timescaled. */
  duration: number;
  /** Dividing `time` or `duration` with this value allows to obtain seconds. */
  timescale: number;
  /**
   * Start and ending bytes (included) for the segment in the whole ISOBMFF
   * buffer.
   */
  range: [number, number];
}

/**
 * Parse the sidx part (segment index) of an ISOBMFF buffer and construct a
 * corresponding Array of available segments.
 *
 * Returns `null` if not found.
 * @param {Uint8Array} buf
 * @param {Number} sidxOffsetInWholeSegment
 * @returns {Object|null} {Array.<Object>} - Information about each subsegment.
 */
function getSegmentsFromSidx(
  buf: Uint8Array,
  sidxOffsetInWholeSegment: number,
): ISidxSegment[] | null {
  const sidxOffsets = getBoxOffsets(buf, 0x73696478 /* "sidx" */);
  if (sidxOffsets === null) {
    return null;
  }
  let offset = sidxOffsetInWholeSegment;
  const boxSize = sidxOffsets[2] - sidxOffsets[0];
  let cursor = sidxOffsets[1];

  /* version(8) */
  /* flags(24) */
  /* reference_ID(32); */
  /* timescale(32); */
  const version = buf[cursor];
  cursor += 4 + 4;
  const timescale = be4toi(buf, cursor);
  cursor += 4;

  /* earliest_presentation_time(32 / 64) */
  /* first_offset(32 / 64) */
  let time;
  if (version === 0) {
    time = be4toi(buf, cursor);
    cursor += 4;
    offset += be4toi(buf, cursor) + boxSize;
    cursor += 4;
  } else if (version === 1) {
    time = be8toi(buf, cursor);
    cursor += 8;
    offset += be8toi(buf, cursor) + boxSize;
    cursor += 8;
  } else {
    return null;
  }

  const segments: ISidxSegment[] = [];

  /* reserved(16) */
  /* reference_count(16) */
  cursor += 2;
  let count = be2toi(buf, cursor);
  cursor += 2;
  while (--count >= 0) {
    /* reference_type(1) */
    /* reference_size(31) */
    /* segment_duration(32) */
    /* sap..(32) */
    const refChunk = be4toi(buf, cursor);
    cursor += 4;
    const refType = (refChunk & 0x80000000) >>> 31;
    const refSize = refChunk & 0x7fffffff;

    // when set to 1 indicates that the reference is to a sidx, else to media
    if (refType === 1) {
      throw new Error("sidx with reference_type `1` not yet implemented");
    }

    const duration = be4toi(buf, cursor);
    cursor += 4;

    // let sapChunk = be4toi(buf, cursor + 8);
    cursor += 4;

    // TODO(pierre): handle sap
    // let startsWithSap = (sapChunk & 0x80000000) >>> 31;
    // let sapType = (sapChunk & 0x70000000) >>> 28;
    // let sapDelta = sapChunk & 0x0FFFFFFF;

    segments.push({
      time,
      duration,
      timescale,
      range: [offset, offset + refSize - 1],
    });

    time += duration;
    offset += refSize;
  }

  return segments;
}

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
function getTrackFragmentDecodeTime(buffer: Uint8Array): number | undefined {
  const traf = getTRAF(buffer);
  if (traf === null) {
    return undefined;
  }
  const tfdt = getBoxContent(traf, 0x74666474 /* tfdt */);
  if (tfdt === null) {
    return undefined;
  }
  const version = tfdt[0];
  if (version === 1) {
    return be8toi(tfdt, 4);
  }
  if (version === 0) {
    return be4toi(tfdt, 4);
  }
  return undefined;
}

/**
 * Returns the "default sample duration" which is the default value for duration
 * of samples found in a "traf" ISOBMFF box.
 *
 * Returns `undefined` if no "default sample duration" has been found.
 * @param {Uint8Array} traf
 * @returns {number|undefined}
 */
function getDefaultDurationFromTFHDInTRAF(traf: Uint8Array): number | undefined {
  const tfhd = getBoxContent(traf, 0x74666864 /* tfhd */);
  if (tfhd === null) {
    return undefined;
  }

  let cursor = /* version */ 1;

  const flags = be3toi(tfhd, cursor);
  cursor += 3;
  const hasBaseDataOffset = (flags & 0x000001) > 0;
  const hasSampleDescriptionIndex = (flags & 0x000002) > 0;
  const hasDefaultSampleDuration = (flags & 0x000008) > 0;

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

  const defaultDuration = be4toi(tfhd, cursor);
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
function getDurationFromTrun(buffer: Uint8Array): number | undefined {
  const trafs = getTRAFs(buffer);
  if (trafs.length === 0) {
    return undefined;
  }

  let completeDuration: number = 0;
  for (const traf of trafs) {
    const trun = getBoxContent(traf, 0x7472756e /* trun */);
    if (trun === null) {
      return undefined;
    }
    let cursor = 0;
    const version = trun[cursor];
    cursor += 1;
    if (version > 1) {
      return undefined;
    }

    const flags = be3toi(trun, cursor);
    cursor += 3;
    const hasSampleDuration = (flags & 0x000100) > 0;

    let defaultDuration: number | undefined = 0;
    if (!hasSampleDuration) {
      defaultDuration = getDefaultDurationFromTFHDInTRAF(traf);
      if (defaultDuration === undefined) {
        return undefined;
      }
    }

    const hasDataOffset = (flags & 0x000001) > 0;
    const hasFirstSampleFlags = (flags & 0x000004) > 0;
    const hasSampleSize = (flags & 0x000200) > 0;
    const hasSampleFlags = (flags & 0x000400) > 0;
    const hasSampleCompositionOffset = (flags & 0x000800) > 0;

    const sampleCounts = be4toi(trun, cursor);
    cursor += 4;

    if (hasDataOffset) {
      cursor += 4;
    }
    if (hasFirstSampleFlags) {
      cursor += 4;
    }

    let i = sampleCounts;
    let duration = 0;
    while (i-- > 0) {
      if (hasSampleDuration) {
        duration += be4toi(trun, cursor);
        cursor += 4;
      } else {
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
  return completeDuration;
}

/**
 * Get timescale information from a movie header box. Found in init segments.
 * `undefined` if not found or not parsed.
 *
 * This timescale is the default timescale used for segments.
 * @param {Uint8Array} buffer
 * @returns {Number | undefined}
 */
function getMDHDTimescale(buffer: Uint8Array): number | undefined {
  const mdia = getMDIA(buffer);
  if (mdia === null) {
    return undefined;
  }

  const mdhd = getBoxContent(mdia, 0x6d646864 /* "mdhd" */);
  if (mdhd === null) {
    return undefined;
  }

  let cursor = 0;
  const version = mdhd[cursor];
  cursor += 4;
  if (version === 1) {
    return be4toi(mdhd, cursor + 16);
  } else if (version === 0) {
    return be4toi(mdhd, cursor + 8);
  }
  return undefined;
}

/**
 * Creates a PSSH box with the given systemId and data.
 * @param {Array.<Object>} psshInfo
 * @returns {Uint8Array}
 */
function createPssh({ systemId, privateData }: IISOBMFFPSSHInfo): Uint8Array {
  const _systemId = systemId.replace(/-/g, "");

  assert(_systemId.length === 32);
  return createBox(
    "pssh",
    concat(
      4, // 4 initial zeroed bytes
      hexToBytes(_systemId),
      itobe4(privateData.length),
      privateData,
    ),
  );
}

/**
 * Update ISOBMFF given to add a "pssh" box in the "moov" box for every content
 * protection in the psshList array given.
 * @param {Uint8Array} buf - the ISOBMFF file
 * @param {Array.<Object>} psshList
 * @returns {Uint8Array} - The new ISOBMFF generated.
 */
function patchPssh(buf: Uint8Array, psshList: IISOBMFFPSSHInfo[]): Uint8Array {
  if (isNullOrUndefined(psshList) || psshList.length === 0) {
    return buf;
  }

  const moovOffsets = getBoxOffsets(buf, 0x6d6f6f76 /* = "moov" */);
  if (moovOffsets === null) {
    return buf;
  }

  const moov = buf.subarray(moovOffsets[0], moovOffsets[2]);
  const moovArr = [moov];
  for (let i = 0; i < psshList.length; i++) {
    moovArr.push(createPssh(psshList[i]));
  }
  const newmoov = updateBoxLength(concat(...moovArr));

  return concat(buf.subarray(0, moovOffsets[0]), newmoov, buf.subarray(moovOffsets[2]));
}

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
function updateBoxLength(buf: Uint8Array): Uint8Array {
  const newLen = buf.length;
  if (newLen < 4) {
    throw new Error("Cannot update box length: box too short");
  }
  const oldSize = be4toi(buf, 0);
  if (oldSize === 0) {
    if (newLen > MAX_32_BIT_INT) {
      const newBox = new Uint8Array(newLen + 8);
      newBox.set(itobe4(1), 0);
      newBox.set(buf.subarray(4, 8), 4);
      newBox.set(itobe8(newLen + 8), 8);
      newBox.set(buf.subarray(8, newLen), 16);
      return newBox;
    } else {
      buf.set(itobe4(newLen), 0);
      return buf;
    }
  } else if (oldSize === 1) {
    if (newLen < 16) {
      throw new Error("Cannot update box length: box too short");
    }
    buf.set(itobe8(newLen), 8);
    return buf;
  } else if (newLen <= MAX_32_BIT_INT) {
    buf.set(itobe4(newLen), 0);
    return buf;
  } else {
    const newBox = new Uint8Array(newLen + 8);
    newBox.set(itobe4(1), 0);
    newBox.set(buf.subarray(4, 8), 4);
    newBox.set(itobe8(newLen + 8), 8);
    newBox.set(buf.subarray(8, newLen), 16);
    return newBox;
  }
}

/**
 * Parse EMSG boxes from ISOBMFF data.
 * @param {Uint8Array} buffer
 * @returns {Array.<Object> | undefined}
 */
function parseEmsgBoxes(buffer: Uint8Array): IEMSG[] | undefined {
  const emsgs: IEMSG[] = [];
  let offset = 0;
  while (offset < buffer.length) {
    const emsg = getEMSG(buffer, offset);
    if (emsg === null) {
      break;
    }

    const length = emsg.length;
    offset += length;

    const version = emsg[0];
    if (version !== 0) {
      log.warn("ISOBMFF: EMSG version " + version.toString() + " not supported.");
    } else {
      let position = 4; // skip version + flags

      const { end: schemeIdEnd, string: schemeIdUri } = readNullTerminatedString(
        emsg,
        position,
      );
      position = schemeIdEnd; // skip schemeIdUri

      const { end: valueEnd, string: value } = readNullTerminatedString(emsg, position);
      position = valueEnd; // skip value

      const timescale = be4toi(emsg, position);
      position += 4; // skip timescale

      const presentationTimeDelta = be4toi(emsg, position);
      position += 4; // skip presentationTimeDelta

      const eventDuration = be4toi(emsg, position);
      position += 4; // skip eventDuration

      const id = be4toi(emsg, position);
      position += 4; // skip id

      const messageData = emsg.subarray(position, length);

      const emsgData = {
        schemeIdUri,
        value,
        timescale,
        presentationTimeDelta,
        eventDuration,
        id,
        messageData,
      };
      emsgs.push(emsgData);
    }
  }
  if (emsgs.length === 0) {
    return undefined;
  }
  return emsgs;
}

/**
 * @param {Uint8Array} segment
 * @returns {Uint8Array|null}
 */
function getKeyIdFromInitSegment(segment: Uint8Array): Uint8Array | null {
  const stsd = getChildBox(
    segment,
    [
      0x6d6f6f76 /* moov */, 0x7472616b /* trak */, 0x6d646961 /* mdia */,
      0x6d696e66 /* minf */, 0x7374626c /* stbl */, 0x73747364 /* stsd */,
    ],
  );
  if (stsd === null) {
    return null;
  }
  const stsdSubBoxes = stsd.subarray(8);
  let encBox = getBoxContent(stsdSubBoxes, 0x656e6376 /* encv */);
  let encContentOffset = 0;
  if (encBox === null) {
    encContentOffset =
      8 + // sample entry header
      8 + // reserved
      2 + // channelcount
      2 + // samplesize
      2 + // predefined
      2 + // reserved
      4; // samplerate
    encBox = getBoxContent(stsdSubBoxes, 0x656e6361 /* enca */);
  } else {
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
  const tenc = getChildBox(
    encBox.subarray(encContentOffset),
    [0x73696e66 /* sinf */, 0x73636869 /* schi */, 0x74656e63 /* tenc */],
  );
  if (tenc === null || tenc.byteLength < 24) {
    return null;
  }
  const keyId = tenc.subarray(8, 24);
  // Zero-filled keyId should only be valid for unencrypted content
  return keyId.every((b) => b === 0) ? null : keyId;
}

export {
  getKeyIdFromInitSegment,
  getMDHDTimescale,
  getPlayReadyKIDFromPrivateData,
  getTrackFragmentDecodeTime,
  getDurationFromTrun,
  getSegmentsFromSidx,
  patchPssh,
  updateBoxLength,
  parseEmsgBoxes,
};
