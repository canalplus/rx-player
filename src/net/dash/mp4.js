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

var assert = require("canal-js-utils/assert");
var {
  itobe4, be8toi, be4toi, be2toi,
  hexToBytes, strToBytes, concat,
} = require("canal-js-utils/bytes");

function findAtom(buf, atomName) {
  var i = 0, l = buf.length;

  var name, size;
  while (i + 8 < l) {
    size = be4toi(buf, i);
    name = be4toi(buf, i + 4);
    assert(size > 0, "dash: out of range size");
    if (name === atomName) {
      break;
    } else {
      i += size;
    }
  }

  if (i >= l) return -1;

  assert(i + size <= l, "dash: atom out of range");
  return i;
}

function parseSidx(buf, offset) {
  var index = findAtom(buf, 0x73696478 /* "sidx" */);
  if (index == -1) return null;

  var size = be4toi(buf, index);
  var pos = index + /* size */4 + /* name */4;

  /* version(8) */
  /* flags(24) */
  /* reference_ID(32); */
  /* timescale(32); */
  var version = buf[pos]; pos += 4 + 4;
  var timescale = be4toi(buf, pos); pos += 4;

  /* earliest_presentation_time(32 / 64) */
  /* first_offset(32 / 64) */
  var time;
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

  var segments = [];

  /* reserved(16) */
  /* reference_count(16) */
  pos += 2;
  var count = be2toi(buf, pos);
  pos += 2;
  while (--count >= 0) {
    /* reference_type(1) */
    /* reference_size(31) */
    /* segment_duration(32) */
    /* sap..(32) */
    var refChunk = be4toi(buf, pos);
    pos += 4;
    var refType = (refChunk & 0x80000000) >>> 31;
    var refSize = (refChunk & 0x7fffffff);
    if (refType == 1)
      throw new Error("not implemented");

    var d = be4toi(buf, pos);
    pos += 4;

    // var sapChunk = be4toi(buf, pos + 8);
    pos += 4;

    // TODO(pierre): handle sap
    // var startsWithSap = (sapChunk & 0x80000000) >>> 31;
    // var sapType = (sapChunk & 0x70000000) >>> 28;
    // var sapDelta = sapChunk & 0x0FFFFFFF;

    var ts = time;
    segments.push({
      ts, d, r: 0,
      range: [offset, offset + refSize - 1],
    });

    time += d;
    offset += refSize;
  }

  return { segments, timescale };
}


function Atom(name, buff) {
  var len = buff.length + 8;
  return concat(itobe4(len), strToBytes(name), buff);
}

function createPssh({ systemId, privateData }) {
  systemId = systemId.replace(/-/g, "");

  assert(systemId.length === 32);
  return Atom("pssh", concat(
    4,
    hexToBytes(systemId),
    itobe4(privateData.length),
    privateData
  ));
}

function patchPssh(buf, pssList) {
  if (!pssList || !pssList.length)
    return buf;

  var pos = findAtom(buf, 0x6d6f6f76 /* = "moov" */);
  if (pos == -1)
    return buf;

  var size = be4toi(buf, pos);
  var moov = buf.subarray(pos, pos + size);

  var newmoov = [moov];
  for (var i = 0; i < pssList.length; i++) {
    newmoov.push(createPssh(pssList[i]));
  }

  newmoov = concat.apply(null, newmoov);
  newmoov.set(itobe4(newmoov.length), 0);

  return concat(
    buf.subarray(0, pos),
    newmoov,
    buf.subarray(pos + size)
  );
}

module.exports = { parseSidx, patchPssh };
