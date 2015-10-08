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
var AbstractSourceBuffer = require("./abstract");

function createFileSourceBuffer(dirName) {

  return class FileSourceBuffer extends AbstractSourceBuffer {
    constructor(codec) {
      super(codec);
      this.filename = path.join(dirName, codec.split("/")[0] + ".h264");
      this.fd = fs.createWriteStream(this.filename, { flags: "w" });
    }

    _append(data) {
      return new Promise_((res, rej) => {
        this.fd.write(new Buffer(data), (err) => err ? rej(err) : res());
      });
    }
  };
}

module.exports = createFileSourceBuffer;
