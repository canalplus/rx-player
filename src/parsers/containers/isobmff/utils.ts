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

import assert from "../../../utils/assert";
import {
  be2toi,
  be3toi,
  be4toi,
  be8toi,
  concat,
  itobe4,
  itobe8,
} from "../../../utils/byte_parsing";
import {
  hexToBytes,
  readTerminatedString,
} from "../../../utils/string_parsing";
import { MAX_32_BIT_INT } from "./constants";
import { createBox } from "./create_box";
import { getPlayReadyKIDFromPrivateData } from "./drm";
import {
  getBoxContent,
  getBoxOffsets,
} from "./get_box";
import {
  getEMSG,
  getMDIA,
  getTRAF,
} from "./read";

/** Information related to a PSSH box. */
export interface IISOBMFFPSSHInfo {
  /** Corresponding DRM's system ID, as an hexadecimal string. */
  systemId : string;
  /** Additional data contained in the PSSH Box. */
  privateData : Uint8Array;
}

export interface IEMSG { schemeId: string;
                         value: string;
                         timescale: number;
                         presentationTimeDelta: number;
                         eventDuration: number;
                         id: number;
                         messageData: Uint8Array; }

/** Segment information from a parsed sidx. */
export interface ISidxSegment {
  /** This segment start time, timescaled. */
  time : number;
  /** This segment difference between its end and start time, timescaled. */
  duration : number;
  /**
   * Amount of time this segment repeats, always , always 0.
   * TODO Remove.
   */
  count : 0;
  /** Dividing `time` or `duration` with this value allows to obtain seconds. */
  timescale : number;
  /**
   * Start and ending bytes (included) for the segment in the whole ISOBMFF
   * buffer.
   */
  range : [number, number];
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
  buf : Uint8Array,
  sidxOffsetInWholeSegment : number
) : ISidxSegment[]|null {
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
  const version = buf[cursor]; cursor += 4 + 4;
  const timescale = be4toi(buf, cursor); cursor += 4;

  /* earliest_presentation_time(32 / 64) */
  /* first_offset(32 / 64) */
  let time;
  if (version === 0) {
    time    = be4toi(buf, cursor);           cursor += 4;
    offset += be4toi(buf, cursor) + boxSize; cursor += 4;
  }
  else if (version === 1) {
    time    = be8toi(buf, cursor);           cursor += 8;
    offset += be8toi(buf, cursor) + boxSize; cursor += 8;
  }
  else {
    return null;
  }

  const segments : ISidxSegment[] = [];

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
    const refSize = (refChunk & 0x7FFFFFFF);

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

    segments.push({ time,
                    duration,
                    count: 0,
                    timescale,
                    range: [offset, offset + refSize - 1] });

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
function getTrackFragmentDecodeTime(buffer : Uint8Array) : number | undefined {
  const traf = getTRAF(buffer);
  if (traf === null) {
    return undefined;
  }
  const tfdt = getBoxContent(traf, 0x74666474 /* tfdt */);
  if (tfdt === null) {
    return undefined;
  }
  const version = tfdt[0];
  return version === 1 ? be8toi(tfdt, 4) :
         version === 0 ? be4toi(tfdt, 4) :
                         undefined;
}

/**
 * Returns the "default sample duration" which is the default value for duration
 * of samples found in a "traf" ISOBMFF box.
 *
 * Returns `undefined` if no "default sample duration" has been found.
 * @param {Uint8Array} traf
 * @returns {number|undefined}
 */
function getDefaultDurationFromTFHDInTRAF(traf : Uint8Array) : number | undefined {
  const tfhd = getBoxContent(traf, 0x74666864 /* tfhd */);
  if (tfhd === null) {
    return undefined;
  }

  let cursor = /* version */ 1;

  const flags = be3toi(tfhd, cursor); cursor += 3;
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
function getDurationFromTrun(buffer : Uint8Array) : number | undefined {
  const traf = getTRAF(buffer);
  if (traf === null) {
    return undefined;
  }

  const trun = getBoxContent(traf, 0x7472756E /* trun */);
  if (trun === null) {
    return undefined;
  }
  let cursor = 0;
  const version = trun[cursor]; cursor += 1;
  if (version > 1) {
    return undefined;
  }

  const flags = be3toi(trun, cursor); cursor += 3;
  const hasSampleDuration = (flags & 0x000100) > 0;

  let defaultDuration : number | undefined = 0;
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

  const sampleCounts = be4toi(trun, cursor); cursor += 4;

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

  return duration;
}

/**
 * Get timescale information from a movie header box. Found in init segments.
 * `undefined` if not found or not parsed.
 *
 * This timescale is the default timescale used for segments.
 * @param {Uint8Array} buffer
 * @returns {Number | undefined}
 */
function getMDHDTimescale(buffer : Uint8Array) : number | undefined {
  const mdia = getMDIA(buffer);
  if (mdia === null) {
    return undefined;
  }

  const mdhd = getBoxContent(mdia, 0x6D646864  /* "mdhd" */);
  if (mdhd === null) {
    return undefined;
  }

  let cursor = 0;
  const version = mdhd[cursor]; cursor += 4;
  return version === 1 ? be4toi(mdhd, cursor + 16) :
         version === 0 ? be4toi(mdhd, cursor + 8) :
                         undefined;
}

/**
 * Creates a PSSH box with the given systemId and data.
 * @param {Array.<Object>} psshInfo
 * @returns {Uint8Array}
 */
function createPssh({ systemId, privateData } : IISOBMFFPSSHInfo) : Uint8Array {
  const _systemId = systemId.replace(/-/g, "");

  assert(_systemId.length === 32);
  return createBox("pssh", concat(4, // 4 initial zeroed bytes
                                  hexToBytes(_systemId),
                                  itobe4(privateData.length),
                                  privateData));
}

/**
 * Update ISOBMFF given to add a "pssh" box in the "moov" box for every content
 * protection in the psshList array given.
 * @param {Uint8Array} buf - the ISOBMFF file
 * @param {Array.<Object>} psshList
 * @returns {Uint8Array} - The new ISOBMFF generated.
 */
function patchPssh(buf : Uint8Array, psshList : IISOBMFFPSSHInfo[]) : Uint8Array {
  if (psshList == null || psshList.length === 0) {
    return buf;
  }

  const moovOffsets = getBoxOffsets(buf, 0x6D6F6F76 /* = "moov" */);
  if (moovOffsets === null) {
    return buf;
  }

  const moov = buf.subarray(moovOffsets[0], moovOffsets[2]);
  const moovArr = [moov];
  for (let i = 0; i < psshList.length; i++) {
    moovArr.push(createPssh(psshList[i]));
  }
  const newmoov = updateBoxLength(concat(...moovArr));

  return concat(buf.subarray(0, moovOffsets[0]),
                newmoov,
                buf.subarray(moovOffsets[2]));
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
function updateBoxLength(buf : Uint8Array) : Uint8Array {
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
 * @param {Uint8Array} buf
 * @returns {Array.<Object>}
 */
function parseEmsgBoxes(buffer: Uint8Array) : IEMSG[] {
  const emsgs: IEMSG[] = [];
  let offset = 0;
  while (offset < buffer.length) {
    const emsg = getEMSG(buffer, offset);
    if (emsg === null) {
      return emsgs;
    }
    const length = emsg.length;
    offset += length;

    let position = 4; // skip version + flags

    const { end: schemeIdEnd, string: schemeId } = readTerminatedString(emsg, position);
    position = schemeIdEnd; // skip schemeId

    const { end: valueEnd, string: value } = readTerminatedString(emsg, position);
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

    const emsgData = { schemeId,
                       value,
                       timescale,
                       presentationTimeDelta,
                       eventDuration,
                       id,
                       messageData };
    emsgs.push(emsgData);
  }
  return emsgs;
}

export {
  getMDHDTimescale,
  getPlayReadyKIDFromPrivateData,
  getTrackFragmentDecodeTime,
  getDurationFromTrun,
  getSegmentsFromSidx,
  patchPssh,
  updateBoxLength,
  parseEmsgBoxes,
};
