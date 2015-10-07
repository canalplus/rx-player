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
var EventEmitter = require("canal-js-utils/eventemitter");
var { findAtom } = require("../utils/mp4");
var { be4toi, be8toi } = require("canal-js-utils/bytes");
var { BufferedRanges } = require("main/core/ranges");
var AbstractSourceBuffer = require("main/core/sourcebuffer");

class SourceBuffer extends AbstractSourceBuffer {
  constructor(codec) {
    super(codec);
    this.inited = false;
  }

  _append(blob) {
    // if moov atom, this is a init segment
    var moov = findAtom(blob, "moov");
    var moof = findAtom(blob, "moof");

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
    }
  }

  _remove(from, to) {
    this.buffered.remove(from, to);
  }
}

function createMediaSource(SourceBuffer=SourceBuffer) {

  var objectUrls = [];

  var URL = {
    createObjectURL(object) {
      var url = "random://"+Math.random();
      objectUrls.push({ url, object });
      return url;
    },

    revokeObjectURL(object) {
      for (var i = 0; i < objectUrls.length; i++) {
        if (objectUrls[i].object === object)
          break;
      }
      if (i < objectUrls.length) {
        objectUrls.splice(i, 1);
      }
    }
  };

  const MediaSourceReadyState = {
    OPEN: "open",
    CLOSED: "closed",
    ENDED: "ended",
  };

  class MediaSource extends EventEmitter {
    static isTypeSupported() {
      return true;
    }

    constructor() {
      super();
      this.readyState = MediaSourceReadyState.CLOSED;
      this._buffers = [];
      this._duration = NaN;

      this._checkInited = () => {
        var inited = this._buffers.every(b => b.inited);
        if (inited) {
          this.trigger("__loadedmetadata__");
          this.trigger("__canPlay__");
          this._buffers.forEach(b => b.removeEventListener("updateend", this._checkInited));
        }
      };

      this._onProgress = () => {
        this.trigger("__progress__");
      };
    }

    _doOpen() {
      setTimeout(() => this._onSourceOpen(), 0);
    }

    _onSourceOpen() {
      assert(this.readyState == MediaSourceReadyState.CLOSED);
      this.readyState = MediaSourceReadyState.OPEN;
      this.trigger("sourceopen");
    }

    addSourceBuffer(codec) {
      assert(this.readyState == MediaSourceReadyState.OPEN);
      var sb = new SourceBuffer(codec);
      sb.addEventListener("updateend", this._checkInited);
      sb.addEventListener("updateend", this._onProgress);
      this._buffers.push(sb);
      return sb;
    }

    removeSourceBuffer(sb) {
      assert(this.readyState == MediaSourceReadyState.OPEN);
      var index = this._buffers.indexOf(sb);
      if (index >= 0) {
        this._buffers.splice(index, 1);
        sb.removeEventListener();
      }
    }

    endOfStream() {
      assert(this.readyState == MediaSourceReadyState.OPEN);
      this.readyState = MediaSourceReadyState.ENDED;
      this.dispose();
    }

    dispose() {
      this._buffers.forEach(b => b.removeEventListener());
    }

    _getBuffered() {
      var ranges = new BufferedRanges();
      for (var i = 0; i < this._buffers.length; i++) {
        var bufferedRanges = this._buffers[i].buffered;
        for (var j = 0; j < bufferedRanges.length; j++) {
          ranges.insert(0, bufferedRanges.start(j), bufferedRanges.end(j));
        }
      }
      return ranges;
    }

    get sourceBuffers() {
      return this._buffers.slice();
    }

    get activeSourceBuffers() {
      return this._buffers.slice();
    }

    get duration() {
      return this._duration;
    }

    set duration(duration) {
      this._duration = duration;
    }
  }

  class HTMLVideoElement extends EventEmitter {
    constructor() {
      super();
      this._clockNow = (function() {
        if (global.performance && global.performance.now) {
          return () => global.performance.now();
        } else {
          return () => Date.now();
        }
      })();
      this._clear();
    }

    _clear() {
      if (this.mediasource) {
        this.mediasource.dispose();
        this.mediasource.removeEventListener();
      }

      this._buffered = new BufferedRanges();
      this._offsetTime = 0;

      this.mediasource = null;

      this.volume = 1;
      this.readyState = 0;
      this.playbackRate = 1;
      this.error = null;
      this.seeking = false;
      this.playing = false;
      this.paused = false;
      this._offset = null;
      this._ended = false;
      this._src = "";

      this._now = this._clockNow();
      this._currentTime = 0;
      if (this._loop) {
        clearInterval(this._loop);
      }
      this._loop = 0;
    }

    _playLoop() {
      if (!this.playing || this.readyState === 0)
        return;

      var now = this._clockNow();
      var diffTime = now - this._now;
      this._now = now;

      var nextCurrentTime = this._currentTime + diffTime / 1000 * this.playbackRate;
      if (this._currentTime !== nextCurrentTime) {
        if (this.buffered.hasRange(nextCurrentTime, 0)) {
          this._currentTime = nextCurrentTime;
          this.trigger("timeupdate");
        }
      }
    }

    _onLoadedMetadata() {
      assert(this.mediasource);
      assert(this.readyState === 0);
      this.readyState = 1;
      this.trigger("loadedmetadata");
      this._loop = setInterval(() => this._playLoop(), 250);
    }

    _awaitForSeeked() {
      if (this.seeking)
        return;

      this.seeking = true;

      var seekTo = this._currentTime;
      var buffers = this.mediasource.sourceBuffers;
      var onBufferUpdateEnd = () => {
        var buffered = this.buffered;
        if (buffered.hasRange(seekTo, 1)) {
          buffers.forEach(b => b.removeEventListener("updateend", onBufferUpdateEnd));
          this.seeking = false;
          this.trigger("seeked");
        }
      };

      buffers.forEach(b => b.addEventListener("updateend", onBufferUpdateEnd));
      onBufferUpdateEnd();
    }

    play() {
      if (this.playing)
        return;

      if (this.readyState > 0) {
        this.paused = false;
        this.playing = true;
        this.trigger("play");
      }
    }

    pause() {
      if (this.paused)
        return;

      if (this.readyState > 0) {
        this.playing = false;
        this.paused = true;
        this.trigger("pause");
      }
    }

    stop() {
      throw "not implemented";
    }

    set src(url) {
      this._clear();
      if (!url) {
        return;
      }

      for (var i = 0; i < objectUrls.length; i++) {
        if (objectUrls[i].url === url) {
          break;
        }
      }

      assert(i >= 0 && i < objectUrls.length, "src not found");
      this.mediasource = objectUrls[i].object;
      this.mediasource.addEventListener("__loadedmetadata__", () => this._onLoadedMetadata());
      this.mediasource.addEventListener("__canPlay__", () => this.trigger("canplay"));
      this.mediasource.addEventListener("__progress__", () => this.trigger("progress"));
      this.mediasource._doOpen();
      this._src = url;
    }

    get src() {
      return this._src;
    }

    get currentTime() {
      return this._currentTime;
    }

    set currentTime(currentTime) {
      assert(this.readyState > 0);
      assert(this.duration);
      assert(currentTime >= 0 && currentTime <= this.duration);
      this._currentTime = currentTime;
      this._awaitForSeeked();
      this.trigger("seeking");
    }

    get buffered() {
      if (this.mediasource) {
        return this.mediasource._getBuffered();
      } else {
        return new BufferedRanges();
      }
    }

    get duration() {
      if (this.mediasource) {
        return this.mediasource.duration;
      } else {
        return NaN;
      }
    }

    get textTracks() {

    }

    trigger(eventName) {
      super(eventName, { type: eventName });
    }
  }

  return { MediaSource, HTMLVideoElement, URL };
}

module.exports = {
  SourceBuffer,
  createMediaSource,
};
