const EventEmitter = require("../utils/eventemitter");
const { BufferedRanges } = require("./ranges");
const assert = require("../utils/assert");
const { tryCatch, castToObservable } = require("../utils/rx-utils");

class AbstractSourceBuffer extends EventEmitter {
  constructor(codec) {
    super();
    this.codec = codec;
    this.updating = false;
    this.readyState = "opened";
    this.buffered = new BufferedRanges();
  }

  appendBuffer(data) {
    this._lock(() => this._append(data));
  }

  remove(from, to) {
    this._lock(() => this._remove(from, to));
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
    assert(!this.updating, "updating");
    this.updating = true;
    this.trigger("updatestart");
    const result = tryCatch(() => castToObservable(func()));
    result.subscribe(
      ()  => setTimeout(() => this._unlock("update"), 0),
      (e) => setTimeout(() => this._unlock("error", e), 0)
    );
  }

  _unlock(eventName, value) {
    this.updating = false;
    this.trigger(eventName, value);
    this.trigger("updateend");
  }
}

module.exports = {
  AbstractSourceBuffer,
};
