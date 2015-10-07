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

var fs = require("fs");
var path = require("path");
var Promise_ = require("canal-js-utils/promise");
var { concat, be2toi, be4toi } = require("canal-js-utils/bytes");
var { findAtom } = require("../utils/mp4");
var { SourceBuffer } = require("./mse-headless");

function createFileSourceBuffer(dirName) {

  return class FileSourceBuffer extends SourceBuffer {
    constructor(codec) {
      super(codec);
      this.filename = path.join(dirName, codec.split("/")[0] + ".h264");
      this.fd = fs.createWriteStream(this.filename, {
        flags: "w",
      });
    }

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

    appendBuffer(data) {
      super(data);
      var mdat = findAtom(data, "mdat");
      var moov = findAtom(data, "moov");
      if (this.codec.indexOf("video") >= 0) {
        return new Promise_((res, rej) => {
          var buffer;
          if (moov) {
            buffer = new Buffer(this._moovToSpsPps(moov));
          }
          else if (mdat) {
            buffer = new Buffer(this._avccToAnnexB(mdat));
          }
          this.fd.write(buffer, (err) => err ? rej(err) : res());
        });
      }
      if (this.codec.indexOf("audio") >= 0) {
        this.fd.write(new Buffer(data));
      }
    }
  };
}

module.exports = createFileSourceBuffer;
