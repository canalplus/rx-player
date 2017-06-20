var { Subject } = require("canal-js-utils/rx");

var BUFFER_APPEND = "append";
var BUFFER_REMOVE = "remove";
var BUFFER_STREAM = "stream";

/**
 * Append/Remove from sourceBuffer in a queue.
 * Wait for the previous buffer action to be finished (updateend event) to
 * perform the next in the queue.
 * @class BufferingQueue
 */
function BufferingQueue(sourceBuffer) {
  this.buffer = sourceBuffer;
  this.queue = [];
  this.flushing = null;

  this._onUpdate = this.onUpdate.bind(this);
  this._onError = this.onError.bind(this);
  this._flush = this.flush.bind(this);

  this.buffer.addEventListener("update", this._onUpdate);
  this.buffer.addEventListener("error", this._onError);
  this.buffer.addEventListener("updateend", this._flush);
};

BufferingQueue.prototype = {
  dispose: function() {
    this.buffer.removeEventListener("update", this._onUpdate);
    this.buffer.removeEventListener("error", this._onError);
    this.buffer.removeEventListener("updateend", this._flush);
    this.buffer = null;
    this.queue.length = 0;
    this.flushing = null;
  },

  onUpdate: function(evt) {
    if (this.flushing) {
      this.flushing.onNext(evt);
      this.flushing.onCompleted();
      this.flushing = null;
    }
  },

  onError: function(error) {
    if (this.flushing) {
      this.flushing.onError(error);
      this.flushing = null;
    }
  },

  /**
   * Queue a new action.
   * Begin flushing if no action were previously in the queue.
   * @param {string} type
   * @param {*} args
   * @returns {Subject} - Can be used to follow the buffer action advancement.
   */
  queueAction: function(type, args) {
    var subj = new Subject();
    var length = this.queue.unshift({ type, args, subj });
    if (length === 1) {
      this.flush();
    }
    return subj;
  },

  appendBuffer: function(buffer) {
    return this.queueAction(BUFFER_APPEND, buffer);
  },

  removeBuffer: function({ start, end }) {
    return this.queueAction(BUFFER_REMOVE, { start, end });
  },

  appendStream: function(stream) {
    return this.queueAction(BUFFER_STREAM, stream);
  },

  /**
   * Perform next queued action if one and none are pending.
   */
  flush: function() {
    if (this.flushing ||
        this.queue.length === 0 ||
        this.buffer.updating) {
      return;
    }

    var { type, args, subj } = this.queue.pop();
    this.flushing = subj;
    try {
      switch(type) {
      case BUFFER_APPEND:
        this.buffer.appendBuffer(args); break;
      case BUFFER_STREAM:
        this.buffer.appendStream(args); break;
      case BUFFER_REMOVE:
        this.buffer.remove(args.start, args.end); break;
      }
    } catch(e) {
      this.onError(e);
    }
  }
};

module.exports = BufferingQueue;
