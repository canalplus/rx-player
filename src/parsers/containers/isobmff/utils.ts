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
  hexToBytes,
  itobe4,
} from "../../../utils/byte_parsing";
import { createBox } from "./create_box";
import { getPlayReadyKIDFromPrivateData } from "./drm";
import {
  getMDIA,
  getTRAF,
} from "./read";

interface IISOBMFFKeySystem {
  systemId : string;
  privateData : Uint8Array;
}

/**
 * Find the right box in an isobmff.
 * @param {Uint8Array} buf - the isobmff
 * @param {Number} wantedName
 * @returns {Number} - Offset where the box begins. -1 if not found.
 */
function findBox(buf : Uint8Array, wantedName : number) : number {
  const len = buf.length;
  let i = 0;
  while (i + 8 < len) {
    const size = be4toi(buf, i);
    if (size <= 0) {
      log.error("ISOBMFF: size out of range");
      return - 1;
    }

    const name = be4toi(buf, i + 4);
    if (name === wantedName) {
      if (i + size <= len) {
        return i;
      }
      log.error("ISOBMFF: box out of range");
      return -1;
    }

    i += size;
  }
  return -1;
}

// Segment information returned from a parsed sidx
export interface ISidxSegment {
  time : number;
  duration : number;
  count : 0;
  timescale : number;
  range : [number, number];
}

/**
 * Parse the sidx part (segment index) of the isobmff.
 * Returns null if not found.
 *
 * @param {Uint8Array} buf
 * @param {Number} initialOffset
 * @returns {Object|null} {Array.<Object>} - Informations about each subsegment.
 * Contains those keys:
 *   - time {Number}: starting _presentation time_ for the subsegment,
 *     timescaled
 *   - duration {Number}: duration of the subsegment, timescaled
 *   - timescale {Number}: the timescale in which the time and duration are set
 *   - count {Number}: always at 0
 *   - range {Array.<Number>}: first and last bytes in the media file
 *     from the anchor point (first byte after the sidx box) for the
 *     concerned subsegment.
 */
function getSegmentsFromSidx(
  buf : Uint8Array,
  initialOffset : number
) : ISidxSegment[]|null {
  const index = findBox(buf, 0x73696478 /* "sidx" */);
  if (index === -1) {
    return null;
  }
  let offset = initialOffset;

  const size = be4toi(buf, index);
  let pos = index + /* size */4 + /* name */4;

  /* version(8) */
  /* flags(24) */
  /* reference_ID(32); */
  /* timescale(32); */
  const version = buf[pos]; pos += 4 + 4;
  const timescale = be4toi(buf, pos); pos += 4;

  /* earliest_presentation_time(32 / 64) */
  /* first_offset(32 / 64) */
  let time;
  if (version === 0) {
    time    = be4toi(buf, pos);        pos += 4;
    offset += be4toi(buf, pos) + size; pos += 4;
  }
  else if (version === 1) {
    time    = be8toi(buf, pos);        pos += 8;
    offset += be8toi(buf, pos) + size; pos += 8;
  }
  else {
    return null;
  }

  const segments : ISidxSegment[] = [];

  /* reserved(16) */
  /* reference_count(16) */
  pos += 2;
  let count = be2toi(buf, pos);
  pos += 2;
  while (--count >= 0) {
    /* reference_type(1) */
    /* reference_size(31) */
    /* segment_duration(32) */
    /* sap..(32) */
    const refChunk = be4toi(buf, pos);
    pos += 4;
    const refType = (refChunk & 0x80000000) >>> 31;
    const refSize = (refChunk & 0x7fffffff);

    // when set to 1 indicates that the reference is to a sidx, else to media
    if (refType === 1) {
      throw new Error("not implemented");
    }

    const duration = be4toi(buf, pos);
    pos += 4;

    // let sapChunk = be4toi(buf, pos + 8);
    pos += 4;

    // TODO(pierre): handle sap
    // let startsWithSap = (sapChunk & 0x80000000) >>> 31;
    // let sapType = (sapChunk & 0x70000000) >>> 28;
    // let sapDelta = sapChunk & 0x0FFFFFFF;

    segments.push({
      time,
      duration,
      count: 0,
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
 * Stops at the first tfdt encountered from the beginning of the file.
 * Returns this time. -1 if not found.
 * @param {Uint8Array} buffer
 * @returns {Number}
 */
function getTrackFragmentDecodeTime(buffer : Uint8Array) : number {
  const traf = getTRAF(buffer);
  if (!traf) {
    return -1;
  }

  const index = findBox(traf, 0x74666474 /* tfdt */);
  if (index === -1) {
    return -1;
  }

  let pos = index + /* size */4 + /* name */4;
  const version = traf[pos]; pos += 4;
  if (version > 1) {
    return -1;
  }

  return version ? be8toi(traf, pos) : be4toi(traf, pos);
}

/**
 * @param {Uint8Array} traf
 * @returns {number}
 */
function getDefaultDurationFromTFHDInTRAF(traf : Uint8Array) : number {
  const index = findBox(traf, 0x74666864 /* tfhd */);
  if (index === -1) {
    return -1;
  }

  let pos = index + /* size */4 + /* name */4 + /* version */ 1;

  const flags = be3toi(traf, pos); pos += 3;

  const hasBaseDataOffset = flags & 0x000001;
  const hasSampleDescriptionIndex = flags & 0x000002;
  const hasDefaultSampleDuration = flags & 0x000008;

  if (!hasDefaultSampleDuration) {
    return -1;
  }

  pos += 4;

  if (hasBaseDataOffset) {
    pos += 8;
  }

  if (hasSampleDescriptionIndex) {
    pos += 4;
  }

  const defaultDuration = be4toi(traf, pos);

  return defaultDuration;
}

/**
 * @param {Uint8Array} buffer
 * @returns {number}
 */
function getDurationFromTrun(buffer : Uint8Array) : number {
  const traf = getTRAF(buffer);
  if (!traf) {
    return -1;
  }

  const index = findBox(traf, 0x7472756e /* trun */);
  if (index === -1) {
    return -1;
  }

  let pos = index + /* size */4 + /* name */4;
  const version = traf[pos]; pos += 1;
  if (version > 1) {
    return -1;
  }
  const flags = be3toi(traf, pos); pos += 3;
  const hasSampleDuration = flags & 0x000100;

  let defaultDuration = 0;
  if (!hasSampleDuration) {
    defaultDuration = getDefaultDurationFromTFHDInTRAF(traf);
    if (defaultDuration < 0) {
      return -1;
    }
  }

  const hasDataOffset = flags & 0x000001;
  const hasFirstSampleFlags = flags & 0x000004;
  const hasSampleSize = flags & 0x000200;
  const hasSampleFlags = flags & 0x000400;
  const hasSampleCompositionOffset = flags & 0x000800;

  const sampleCounts = be4toi(traf, pos); pos += 4;

  if (hasDataOffset) {
    pos += 4;
  }

  if (hasFirstSampleFlags) {
    pos += 4;
  }

  let i = sampleCounts;
  let duration = 0;
  while (i--) {
    if (hasSampleDuration) {
      duration += be4toi(traf, pos);
      pos += 4;
    } else {
      duration += defaultDuration;
    }
    if (hasSampleSize) {
      pos += 4;
    }
    if (hasSampleFlags) {
      pos += 4;
    }
    if (hasSampleCompositionOffset) {
      pos += 4;
    }
  }

  return duration;
}

/**
 * Get various informations from a movie header box. Found in init segments.
 * null if not found or not parsed.
 *
 * This timescale is the default timescale used for segments.
 * @param {Uint8Array} buffer
 * @returns {Number}
 */
function getMDHDTimescale(buffer : Uint8Array) : number {
  const mdia = getMDIA(buffer);
  if (!mdia) {
    return -1;
  }

  const index = findBox(mdia, 0x6d646864  /* "mdhd" */);
  if (index === -1) {
    return -1;
  }

  let pos = index + /* size */4 + /* name */4;

  const version = mdia[pos]; pos += 4;
  if (version === 1) {
    pos += 16;
    return be4toi(mdia, pos);
  } else if (version === 0) {
    pos += 8;
    return be4toi(mdia, pos);
  } else {
    return -1;
  }
}

/**
 * Returns a PSSH box from a systemId and private data.
 * @param {Array.<Object>} pssList - The content protections under the form of
 * object containing two properties:
 *   - systemId {string}: The uuid code. Should only contain 32 hexadecimal
 *     numbers and hyphens
 *   - privateData {Uint8Array} private data associated.
 * @returns {Uint8Array}
 */
function createPssh({ systemId, privateData } : IISOBMFFKeySystem) : Uint8Array {
  const _systemId = systemId.replace(/-/g, "");

  assert(_systemId.length === 32);
  return createBox("pssh", concat(
    4, // 4 initial zeroed bytes
    hexToBytes(_systemId),
    itobe4(privateData.length),
    privateData
  ));
}

/**
 * Update ISOBMFF given to add a "pssh" box in the "moov" box for every content
 * protection in the pssList array given.
 * @param {Uint8Array} buf - the ISOBMFF file
 * @param {Array.<Object>} pssList - The content protections under the form of
 * objects containing two properties:
 *   - systemId {string}: The uuid code. Should only contain 32 hexadecimal
 *     numbers and hyphens
 *   - privateData {Uint8Array} private data associated.
 * @returns {Uint8Array} - The new ISOBMFF generated.
 */
function patchPssh(buf : Uint8Array, pssList : IISOBMFFKeySystem[]) : Uint8Array {
  if (!pssList || !pssList.length) {
    return buf;
  }

  const pos = findBox(buf, 0x6d6f6f76 /* = "moov" */);
  if (pos === -1) {
    return buf;
  }

  const size = be4toi(buf, pos); // size of the "moov" box
  const moov = buf.subarray(pos, pos + size);

  const moovArr = [moov];
  for (let i = 0; i < pssList.length; i++) {
    moovArr.push(createPssh(pssList[i]));
  }

  const newmoov = concat(...moovArr);
  newmoov.set(itobe4(newmoov.length), 0); // overwrite "moov" length

  return concat(
    buf.subarray(0, pos),
    newmoov,
    buf.subarray(pos + size)
  );
}

export {
  getMDHDTimescale,
  getPlayReadyKIDFromPrivateData,
  getTrackFragmentDecodeTime,
  getDurationFromTrun,
  getSegmentsFromSidx,
  patchPssh,
};
