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

var Promise_ = require("canal-js-utils/promise");
var _ = require("canal-js-utils/misc");
var assert = require("canal-js-utils/assert");
var EventEmitter = require("canal-js-utils/eventemitter");
var { BufferedRanges } = require("./ranges");

function AbstractSourceBuffer() {
  EventEmitter.call(this);
  this.updating = false;
  this.readyState = "opened";
  this.buffered = new BufferedRanges();
}

AbstractSourceBuffer.prototype = _.extend({}, EventEmitter.prototype, {
  appendBuffer(data) {
    return this._lock(() => this._append(data));
  },
  remove(from, to) {
    return this._lock(() => this._remove(from, to));
  },
  abort() {
    this.remove(0, Infinity);
    this.updating = false;
    this.readyState = "closed";
    this._abort();
  },
  _append(data) {},
  _remove(from, to) {},
  _lock(func) {
    assert(!this.updating, "text-buffer: cannot remove while updating");
    this.updating = true;
    this.trigger("updatestart");
    return new Promise_(res => res(func()))
      .then(
        ()  => this._unlock("update"),
        (e) => this._unlock("error", e)
      );
  },
  _unlock(eventName, value) {
    this.trigger(eventName, value);
    this.updating = false;
    this.trigger("updateend");
  },
});

function emptyTextTrack(track, from=0, to=Infinity) {
  _.each(_.cloneArray(track.cues), (cue) => {
    var { startTime, endTime } = cue;
    if (startTime >= from && startTime <= to && endTime <= to) {
      track.removeCue(cue);
    }
  });
}

var Cue = window.VTTCue || window.TextTrackCue;

function TextSourceBuffer(video, codec) {
  AbstractSourceBuffer.call(this);
  this.video = video;
  this.codec = codec;
  this.isVTT = /^text\/vtt/.test(codec);
  // there is no removeTextTrack method... so we need to reuse old
  // text-tracks objects and clean all its pending cues
  var track;
  if (video.textTracks.length) {
    track = video.textTracks[0];
    emptyTextTrack(track);
  } else {
    track = video.addTextTrack("captions");
  }
  track.mode = "showing";
  this.track = track;
}

TextSourceBuffer.prototype = _.extend({}, AbstractSourceBuffer.prototype, {
  // Creates a new <track> element in which we inject the VTT text from
  // a Blob and copy all the cues from this track to the main textTrack
  // object. This <track> is then removed.
  createCuesFromVTT(vtt) {
    var trackElement;
    var videoElement = this.video;

    var removeTrackElement = () => {
      if (videoElement.hasChildNodes(trackElement)) {
        videoElement.removeChild(trackElement);
        trackElement = null;
      }
    };

    return new Promise_((resolve) => {
      var blob = new Blob([vtt], { type: "text/vtt" });
      var url = URL.createObjectURL(blob);
      trackElement = document.createElement("track");
      trackElement.style.display = "none";
      trackElement.mode = "hidden";
      trackElement.addEventListener("load", () => {
        resolve(_.cloneArray(trackElement.track.cues));
      });
      videoElement.appendChild(trackElement);
      trackElement.src = url;
    }).then(
      (o) => {
        removeTrackElement();
        return o;
      },
      (e) => {
        removeTrackElement();
        throw e;
      });
  },

  createCuesFromArray(cues) {
    if (!cues.length)
      return [];

    var start = cues[0].start;
    var end = _.last(cues).end;
    return _.compact(_.map(cues, ({ start, end, text }) => {
      if (text) return new Cue(start, end, text);
    }));
  },

  _append(cues) {
    return Promise_.resolve((this.isVTT)
      ? this.createCuesFromVTT(cues)
      : this.createCuesFromArray(cues))
    .then((trackCues) => {
      if (!trackCues.length) return;
      _.each(trackCues, cue => this.track.addCue(cue));
      var firstCue = trackCues[0];
      var lastCue = _.last(trackCues);
      this.buffered.insert(0, firstCue.startTime, lastCue.endTime);
    });
  },

  _remove(from, to) {
    emptyTextTrack(this.track, from, to);
  },

  _abort() {
    this.track.mode = "disabled";
    this.size = 0;
    this.video = null;
  },
});

module.exports = TextSourceBuffer;
