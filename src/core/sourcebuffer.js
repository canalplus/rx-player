const EventEmitter = require("../utils/eventemitter");
const { BufferedRanges } = require("./ranges");
const assert = require("../utils/assert");
const { tryCatch, castToObservable } = require("../utils/rx-utils");

/**
 * Abstract class for a custom SourceBuffer implementation.
 * @class AbstractSourceBuffer
 * @extends EventEmitter
 */
class AbstractSourceBuffer extends EventEmitter {
  constructor(codec) {
    super();
    this.codec = codec;
    this.updating = false;
    this.readyState = "opened";
    this.buffered = new BufferedRanges();
  }

  /**
   * Mimic the SourceBuffer _appendBuffer_ method: Append segment.
   * @param {*} data
   */
  appendBuffer(data) {
    this._lock(() => this._append(data));
  }

  /**
   * Mimic the SourceBuffer _remove_ method: remove segment.
   * @param {Number} from
   * @param {Number} to
   */
  remove(from, to) {
    this._lock(() => this._remove(from, to));
  }

  /**
   * Mimic the SourceBuffer _abort_ method.
   */
  abort() {
    this.remove(0, Infinity);
    this.updating = false;
    this.readyState = "closed";
    this._abort();
  }

  _append(/* data */) {} // to implement, called on appendBuffer
  _remove(/* from, to */) {} // to implement, called on remove
  _abort() {}  // to implement, called on abort

  /**
   * Active a lock, execute the given function, unlock when finished (on
   * nextTick).
   * Throws if multiple lock are active at the same time.
   * Also triggers the right events on start, error and end
   * @param {Function} func
   */
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

  /**
   * Free the lock and trigger the right events.
   * @param {string} eventName
   * @param {*} value - value sent with the given event.
   */
  _unlock(eventName, value) {
    this.updating = false;
    this.trigger(eventName, value);
    this.trigger("updateend");
  }
}

module.exports = {
  AbstractSourceBuffer,
};
