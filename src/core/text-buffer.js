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

const { AbstractSourceBuffer } = require("./sourcebuffer");
const { addTextTrack, isVTTSupported } = require("./compat");
const log = require("../utils/log");

const Cue = window.VTTCue || window.TextTrackCue;

class TextSourceBuffer extends AbstractSourceBuffer {

  constructor(video, codec, hideNativeSubtitle) {
    super(codec);
    this.video = video;
    this.codec = codec;
    this.isVTT = /^text\/vtt/.test(codec);

    const { track, trackElement } = addTextTrack(video, hideNativeSubtitle);
    this.track = track;
    this.trackElement = trackElement;
  }

  createCuesFromArray(cues) {
    const nativeCues = [];
    for (let i = 0; i < cues.length; i++) {
      const { start, end, text } = cues[i];
      if (text) {
        nativeCues.push(new Cue(start, end, text));
      }
    }
    return nativeCues;
  }

  _append(cues) {
    if (this.isVTT && isVTTSupported()) {
      const blob = new Blob([cues], { type: "text/vtt" });
      const url = URL.createObjectURL(blob);
      if (this.trackElement) {
        this.trackElement.src = url;
        this.buffered.insert(0, Infinity);
      } else {
        log.warn("vtt subtitles not supported");
      }
    }
    else {
      const newCues = this.createCuesFromArray(cues);
      if (newCues.length > 0) {
        const firstCue = newCues[0];
        const lastCue = newCues[newCues.length - 1];

        // NOTE(compat): cleanup all current cues if the newly added
        // ones are in the past. this is supposed to fix an issue on
        // IE/Edge.
        const currentCues = this.track.cues;
        if (currentCues.length > 0) {
          if (firstCue.startTime < currentCues[currentCues.length - 1].startTime) {
            this._remove(firstCue.startTime, +Infinity);
          }
        }

        newCues.forEach((cue) => this.track.addCue(cue));
        this.buffered.insert(0, firstCue.startTime, lastCue.endTime);
      }
    }
  }

  _remove(from, to) {
    const track = this.track;
    const cues = track.cues;
    for (let i = cues.length - 1; i >= 0; i--) {
      const cue = cues[i];
      const { startTime, endTime } = cue;
      if (startTime >= from && startTime <= to && endTime <= to) {
        track.removeCue(cue);
      }
    }
    this.buffered.remove(from, to);
  }

  _abort() {
    const { trackElement, video } = this;
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
