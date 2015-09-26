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
var AbstractSourceBuffer = require("./sourcebuffer");

var Cue = window.VTTCue || window.TextTrackCue;

class TextSourceBuffer extends AbstractSourceBuffer {

  constructor(video, codec) {
    super(codec);
    this.video = video;
    this.codec = codec;
    this.isVTT = /^text\/vtt/.test(codec);
    // there is no removeTextTrack method... so we need to reuse old
    // text-tracks objects and clean all its pending cues
    var trackElement = document.createElement("track");
    var track = trackElement.track;
    this.trackElement = trackElement;
    this.track = track;
    trackElement.kind = "subtitles";
    track.mode = "showing";
    video.appendChild(trackElement);
  }

  createCuesFromArray(cues) {
    var nativeCues = [];
    for (var i = 0; i < cues.length; i++) {
      var { start, end, text } = cues[i];
      if (text) {
        nativeCues.push(new Cue(start, end, text));
      }
    }
    return nativeCues;
  }

  _append(cues) {
    if (this.isVTT) {
      var blob = new Blob([cues], { type: "text/vtt" });
      var url = URL.createObjectURL(blob);
      this.trackElement.src = url;
      this.buffered.insert(0, Infinity);
    }
    else {
      var trackCues = this.createCuesFromArray(cues);
      if (trackCues.length) {
        trackCues.forEach(cue => this.track.addCue(cue));
        var firstCue = trackCues[0];
        var lastCue = trackCues[trackCues.length - 1];
        this.buffered.insert(0, firstCue.startTime, lastCue.endTime);
      }
    }
    return Promise_.resolve();
  }

  _remove(from, to) {
    var track = this.track;
    var cues = track.cues;
    for (var i = 0; i < cues.length; i++) {
      var cue = cues[i];
      var { startTime, endTime } = cue;
      if (startTime >= from && startTime <= to && endTime <= to) {
        track.removeCue(cue);
      }
    }
  }

  _abort() {
    var { trackElement, video } = this;
    if (trackElement && video && video.hasChildNodes(trackElement)) {
      video.removeChild(trackElement);
    }
    this.track.mode = "disabled";
    this.size = 0;
    this.trackElement = null;
    this.track = null;
    this.video = null;
  }
}

module.exports = TextSourceBuffer;
