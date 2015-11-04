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
var { concat, be2toi, be4toi, be8toi } = require("canal-js-utils/bytes");
var { findAtom } = require("../utils/mp4");
var AbstractSourceBuffer = require("./abstract");

class MP4SourceBuffer extends AbstractSourceBuffer {
  constructor(codec) {
    super(codec);
    this.inited = false;
  }

  _append(data) {
    // if moov atom, this is a init segment
    var moov = findAtom(data, "moov");
    var moof = findAtom(data, "moof");

    if (moov) {
      var mdhd = findAtom(findAtom(findAtom(moov, "trak"), "mdia"), "mdhd");
      var version = mdhd[0];
      var timescale;
      if (version === 1) {
        timescale = be4toi(mdhd, 20);
      } else {
        timescale = be4toi(mdhd, 12);
      }
      assert(timescale > 0);
      this.inited = true;
      this.timescale = timescale;
    }

    if (moof) {
      assert(this.timescale > 0);
      var traf = findAtom(moof, "traf");
      var tfhd = findAtom(traf, "tfhd");
      var tfdt = findAtom(traf, "tfdt");
      var trun = findAtom(traf, "trun");

      var defaultSampleDuration = 0;
      var tfhdFlags = be4toi(tfhd, 0) & 0x00FFFFFF;
      var defaultSampleDurationPresent = tfhdFlags & (1 << 3);
      if (defaultSampleDurationPresent) {
        var baseDataOffsetPresent = tfhdFlags & (1);
        var sampleDescriptionIndexPresent = tfhdFlags & (1 << 1);

        var defaultSampleDurationOffset = 8;
        if (baseDataOffsetPresent)
          defaultSampleDurationOffset += 4;
        if (sampleDescriptionIndexPresent)
          defaultSampleDurationOffset += 4;

        defaultSampleDuration = be4toi(tfhd, defaultSampleDurationOffset);
      }

      var trunFlags = be4toi(trun, 0) & 0x00FFFFFF;
      var sampleCount = be4toi(trun, 4);

      var dataOffsetPresent = trunFlags & (1);
      var firstSampleFlagsPresent = trunFlags & (1 << 2);
      var sampleDurationPresent = trunFlags & (1 << 8);
      var sampleSizePresent = trunFlags & (1 << 9);
      var sampleFlagsPresent = trunFlags & (1 << 10);
      var sampleCompositionFlagOffsetPresent = trunFlags & (1 << 11);

      var totalDuration = 0;
      if (defaultSampleDuration > 0) {
        assert(!sampleDurationPresent);
        totalDuration = sampleCount * defaultSampleDuration;
      }
      else {
        var offset = 8;
        if (dataOffsetPresent)
          offset += 4;
        if (firstSampleFlagsPresent)
          offset += 4;

        var sampleSize = 0;
        if (sampleDurationPresent)
          sampleSize += 4;
        if (sampleSizePresent)
          sampleSize += 4;
        if (sampleFlagsPresent)
          sampleSize += 4;
        if (sampleCompositionFlagOffsetPresent)
          sampleSize += 4;

        var count = 0;
        for (; offset < trun.length; offset += sampleSize) {
          totalDuration += be4toi(trun, offset);
          count++;
        }

        assert(count === sampleCount);
      }

      var decodeTime = be8toi(tfdt, 4);
      assert(totalDuration > 0);
      assert(decodeTime >= 0);

      this.buffered.insert(0,
        (decodeTime / this.timescale),
        (decodeTime + totalDuration) / this.timescale);

      return data;
    }
  }

  _remove(from, to) {
    this.buffered.remove(from, to);
  }
}

class H264SourceBuffer extends MP4SourceBuffer {
  _avccToAnnexB(mdat) {
    var annexB = new Uint8Array(mdat.length);
    var i = 0;
    while (i < mdat.length) {
      var size = be4toi(mdat, i);
      annexB[i]   = 0;
      annexB[i+1] = 0;
      annexB[i+2] = 0;
      annexB[i+3] = 1;
      annexB.set(mdat.subarray(i + 4, i + 4 + size), i + 4);
      i += size + 4;
    }
    return annexB;
  }

  _moovToSpsPps(moov) {
    var stsd =
      findAtom(
        findAtom(
          findAtom(
            findAtom(
              findAtom(moov,
              "trak"),
            "mdia"),
          "minf"),
        "stbl"),
      "stsd");

    var avc1 = findAtom(stsd.subarray(8), "avc1");
    if (avc1) {
      var avcC = findAtom(avc1.subarray(78), "avcC");
      var spsLength = be2toi(avcC, 6);
      var ppsLength = be2toi(avcC, 6 + 2 + spsLength + 1);
      var sps = avcC.subarray(8, 8 + spsLength);
      var pps = avcC.subarray(8 + spsLength + 1 + 2, 8 + spsLength + 1 + 2 + ppsLength);
      return concat([0, 0, 0, 1], sps, [0, 0, 0, 1], pps);
    }
    else {
      throw new Error("could not find avcC atom");
    }
  }

  _append(data) {
    data = super(data);
    var mdat = findAtom(data, "mdat");
    var moov = findAtom(data, "moov");
    if (moov) {
      return new Buffer(this._moovToSpsPps(moov));
    }
    else if (mdat) {
      return new Buffer(this._avccToAnnexB(mdat));
    }
    else {
      return new Buffer();
    }
  }
}

module.exports = {
  MP4SourceBuffer,
  H264SourceBuffer,
};
