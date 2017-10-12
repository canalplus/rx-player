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

import assert from "../../utils/assert";
import {
  itobe4, be8toi, be4toi, be2toi, be3toi,
  hexToBytes, strToBytes, concat,
} from "../../utils/bytes";

/**
 * Find the right atom (box) in an isobmff file from its hexa-encoded name.
 * @param {Uint8Array} buf - the isobmff structure
 * @param {Number} atomName - the 'name' of the box (e.g. 'sidx' or 'moov'),
 * hexa encoded
 * @returns {Number} - offset where the corresponding box is (starting with its
 * size), 0 if not found.
 */
function findAtom(buf : Uint8Array, atomName : number) : number {
  const l = buf.length;
  let i = 0;

  let name : number;
  let size = 0;
  while (i + 8 < l) {
    size = be4toi(buf, i);
    name = be4toi(buf, i + 4);
    assert(size > 0, "out of range size");
    if (name === atomName) {
      break;
    } else {
      i += size;
    }
  }

  if (i >= l) {
    return -1;
  }

  assert(i + size <= l, "atom out of range");
  return i;
}

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
 * @param {Number} offset
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
function parseSidx(
  buf : Uint8Array,
  offset : number
) : ISidxSegment[]|null {
  const index = findAtom(buf, 0x73696478 /* "sidx" */);
  if (index === -1) {
    return null;
  }

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

    const d = be4toi(buf, pos);
    pos += 4;

    // let sapChunk = be4toi(buf, pos + 8);
    pos += 4;

    // TODO(pierre): handle sap
    // let startsWithSap = (sapChunk & 0x80000000) >>> 31;
    // let sapType = (sapChunk & 0x70000000) >>> 28;
    // let sapDelta = sapChunk & 0x0FFFFFFF;

    segments.push({
      time,
      duration: d,
      count: 0,
      timescale,
      range: [offset, offset + refSize - 1],
    });

    time += d;
    offset += refSize;
  }

  return segments;
}

/**
 * Parse track Fragment Decode Time to get a precize initial time for this
 * segment (in the media timescale).
 * Returns this time. -1 if not found.
 * @param {Uint8Array} buffer
 * @returns {Number}
 */
function parseTfdt(buffer : Uint8Array) : number {
  const moof = getAtomContent(buffer, 0x6d6f6f66 /* moof */);
  if (!moof) {
    return -1;
  }

  const traf = getAtomContent(moof, 0x74726166 /* traf */);
  if (!traf) {
    return -1;
  }

  const index = findAtom(traf, 0x74666474 /* tfdt */);
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

function getDefaultDurationFromTFHDInTRAF(traf : Uint8Array) : number {
  const index = findAtom(traf, 0x74666864 /* tfhd */);
  if (index === -1) {
    return -1;
  }

  let pos = index + /* size */4 + /* name */4 + /* version */ 1;

  const flags = be3toi(traf, pos);

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

function getDurationFromTrun(buffer : Uint8Array) : number {
  const moof = getAtomContent(buffer, 0x6d6f6f66 /* moof */);
  if (!moof) {
    return -1;
  }

  const traf = getAtomContent(moof, 0x74726166 /* traf */);
  if (!traf) {
    return -1;
  }

  const index = findAtom(traf, 0x7472756e /* tfdt */);
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
    if (defaultDuration >= 0) {
      return defaultDuration;
    }
    return -1;
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
  const moov = getAtomContent(buffer, 0x6d6f6f76 /* moov */);
  if (!moov) {
    return -1;
  }

  const trak = getAtomContent(moov, 0x7472616b /* "trak" */);
  if (!trak) {
    return -1;
  }

  const mdia = getAtomContent(trak, 0x6d646961 /* "mdia" */);
  if (!mdia) {
    return -1;
  }

  const index = findAtom(mdia, 0x6d646864  /* "mdhd" */);
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
 * @param {Uint8Array} buf - the isobmff structure
 * @param {Number} atomName - the 'name' of the box (e.g. 'sidx' or 'moov'),
 * hexa encoded
 * @returns {UInt8Array|null}
 */
function getAtomContent(buf : Uint8Array, atomName : number) : Uint8Array|null {
  const l = buf.length;
  let i = 0;

  let name : number;
  let size : number = 0;
  while (i + 8 < l) {
    size = be4toi(buf, i);
    name = be4toi(buf, i + 4);
    assert(size > 0, "out of range size");
    if (name === atomName) {
      break;
    } else {
      i += size;
    }
  }

  if (i < l) {
    return buf.subarray(i + 8, i + size);
  } else {
    return null;
  }
}

/**
 * @param {Uint8Array} buf - The isobmff
 * @returns {Uint8Array|null} - Content of the mdat atom, null if not found
 */
function getMdat(buf : Uint8Array) : Uint8Array|null {
  return getAtomContent(buf, 0x6D646174 /* "mdat" */);
}

/**
 * Create a new _Atom_ (isobmff box).
 * @param {string} name - The box name (e.g. sidx, moov, pssh etc.)
 * @param {Uint8Array} buff - The box's content
 */
function Atom(name : string, buff : Uint8Array) : Uint8Array {
  const len = buff.length + 8;
  return concat(itobe4(len), strToBytes(name), buff);
}

/**
 * Returns a PSSH Atom from a systemId and private data.
 * @param {Object} args
 * @returns {Uint8Array}
 */
function createPssh(
  { systemId, privateData } : { systemId : string, privateData: any }
) : Uint8Array {
  systemId = systemId.replace(/-/g, "");

  assert(systemId.length === 32);
  return Atom("pssh", concat(
    4, // 4 initial zeroed bytes
    hexToBytes(systemId),
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
 *   - privateData {*}: private data associated.
 * @returns {Uint8Array} - The new ISOBMFF generated.
 */
function patchPssh(buf : Uint8Array, pssList : any[]) : Uint8Array {
  if (!pssList || !pssList.length) {
    return buf;
  }

  const pos = findAtom(buf, 0x6d6f6f76 /* = "moov" */);
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
  parseTfdt,
  getDurationFromTrun,
  parseSidx,
  getMdat,
  patchPssh,
};
