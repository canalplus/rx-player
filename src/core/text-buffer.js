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

var AbstractSourceBuffer = require("./sourcebuffer");
var { addTextTrack, isVTTSupported } = require("./compat");
var log = require("canal-js-utils/log");

var Cue = window.VTTCue || window.TextTrackCue;

class TextSourceBuffer extends AbstractSourceBuffer {

  constructor(video, codec) {
    super(codec);
    this.video = video;
    this.codec = codec;
    this.isVTT = /^text\/vtt/.test(codec);

    var { track, trackElement } = addTextTrack(video);
    this.track = track;
    this.trackElement = trackElement;
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
    if (this.isVTT && !isVTTSupported()) {
      var blob = new Blob([cues], { type: "text/vtt" });
      var url = URL.createObjectURL(blob);
      if (this.trackElement) {
        this.trackElement.src = url;
        this.buffered.insert(0, Infinity);
      } else {
        log.warn("vtt subtitles not supported");
      }
    }
    else {
      var newCues = this.createCuesFromArray(cues);
      if (newCues.length > 0) {
        var firstCue = newCues[0];
        var lastCue = newCues[newCues.length - 1];

        // NOTE(compat): cleanup all current cues if the newly added
        // ones are in the past. this is supposed to fix an issue on
        // IE/Edge.
        var currentCues = this.track.cues;
        if (currentCues.length > 0) {
          if (firstCue.startTime < currentCues[currentCues.length - 1].endTime) {
            this._remove(0, +Infinity);
          }
        }

        newCues.forEach(cue => this.track.addCue(cue));
        this.buffered.insert(0, firstCue.startTime, lastCue.endTime);
      }
    }
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
    this.buffered.remove(from, to);
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
