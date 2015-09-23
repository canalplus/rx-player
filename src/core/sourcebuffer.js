var EventEmitter = require("canal-js-utils/eventemitter");
var { BufferedRanges } = require("./ranges");
var Promise_ = require("canal-js-utils/promise");
var assert = require("canal-js-utils/assert");

class AbstractSourceBuffer extends EventEmitter {
  constructor(codec) {
    super();
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
