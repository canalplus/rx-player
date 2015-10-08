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

var EventEmitter = require("canal-js-utils/eventemitter");
var { BufferedRanges } = require("../core/ranges");
var Promise_ = require("canal-js-utils/promise");
var assert = require("canal-js-utils/assert");

class AbstractSourceBuffer extends EventEmitter {
  constructor(codec, mediaSource) {
    super();
    this.mediaSource = mediaSource;
    this.codec = codec;
    this.updating = false;
    this.readyState = "opened";
    this.buffered = new BufferedRanges();
  }

  appendBuffer(data) {
    return this._lock(() => this._append(data));
  }

  remove(from, to) {
    return this._lock(() => this._remove(from, to));
  }

  abort() {
    this.remove(0, Infinity);
    this.updating = false;
    this.readyState = "closed";
    this._abort();
  }

  _append(/* data */) {}
  _remove(/* from, to */) {}
  _abort() {}

  _lock(func) {
    assert(!this.updating, "text-buffer: cannot remove while updating");
    this.updating = true;
    this.trigger("updatestart");
    return new Promise_(res => res(func()))
      .then(
        ()  => this._unlock("update"),
        (e) => this._unlock("error", e)
      );
  }

  _unlock(eventName, value) {
    this.trigger(eventName, value);
    this.updating = false;
    this.trigger("updateend");
  }
}

module.exports = AbstractSourceBuffer;
