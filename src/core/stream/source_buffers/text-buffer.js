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

import { AbstractSourceBuffer } from "./abstract.js";
import { addTextTrack, isVTTSupported } from "../../../compat";
import log from "../../../utils/log";

const Cue = window.VTTCue || window.TextTrackCue;

/**
 * Creates an array of VTTCue/TextTrackCue from a given array of cue objects.
 * @param {Array.<Object>} - Objects containing the start, end and text.
 * @returns {Array.<Cue>}
 */
function createCuesFromArray(cuesArray) {
  const nativeCues = [];
  for (let i = 0; i < cuesArray.length; i++) {
    const { start, end, text } = cuesArray[i];
    if (text) {
      nativeCues.push(new Cue(start, end, text));
    }
  }
  return nativeCues;
}

/**
 * Implementation of a SourceBuffer used for TextTracks.
 *
 * The data appended through ``appendBuffer`` should be an object with the
 * following keys:
 *
 *   - data {*}: The texttrack data
 *
 *   - timescale {Number}: the timescale. That is, the number of time units that
 *     pass in one second. For example, a time coordinate system that measures
 *     time in sixtieths of a second has a timescale of 60.
 *
 *   - start {Number}: The start time, timescaled, those texttracks are for.
 *     Note that this value is different than the start of the first cue:
 *       - the start of the first cue is the time at which the first cue in the
 *         data given should begin to be displayed.
 *       - ``start`` is the absolute start time for which the data apply.
 *     That means, if the given data is for a segment that begins with 10s
 *     without any cue, the ``start`` value should be 10s (timescaled) inferior
 *     to the start of the first cue.
 *     This is useful to copy the behavior of "native" SourceBuffer to indicate
 *     which segments have been "buffered".
 *
 *   - end {Number|undefined}: The end time, timescaled, those texttracks are
 *     for.
 *     Check ``start`` for more informations about the difference between this
 *     value and the end of the last cue in the data.
 *     This number can be undefined to raise the error resilience. In that case,
 *     the end time will be defined from the last text track in the data.
 *
 * @class TextSourceBuffer
 * @extends AbstractSourceBuffer
 */
class TextSourceBuffer extends AbstractSourceBuffer {

  constructor(video, codec, hideNativeSubtitle) {
    super(codec);
    const { track, trackElement } = addTextTrack(video, hideNativeSubtitle);

    this._videoElement = video;
    this._isVtt = /^text\/vtt/.test(codec);
    this._track = track;
    this._trackElement = trackElement;
  }

  /**
   * Append text tracks.
   * @param {Object} data
   * @param {*} data.data
   * @param {Number} data.timescale
   * @param {Number} data.start
   * @param {Number|undefined} data.end
   */
  _append(data) {
    const {
      timescale,
      start: timescaledStart,
      end: timescaledEnd,
      data: cues,
    } = data;
    if (timescaledEnd - timescaledStart <= 0) {
      return;
    }
    const startTime = timescaledStart / timescale;
    const endTime = timescaledEnd != null ?
      timescaledEnd / timescale : undefined;

    if (this._isVtt) {
      if (isVTTSupported() && this._trackElement) {
        const blob = new Blob([cues], { type: "text/vtt" });
        const url = URL.createObjectURL(blob);
        this._trackElement.src = url;
        this.buffered.insert(
          startTime,
          endTime != null ? endTime : Number.MAX_VALUE
        );
      } else {
        log.warn("vtt subtitles not supported");
      }
    }
    else {
      const newCues = createCuesFromArray(cues);
      if (newCues.length > 0) {
        const firstCue = newCues[0];

        // NOTE(compat): cleanup all current cues if the newly added
        // ones are in the past. this is supposed to fix an issue on
        // IE/Edge.
        const currentCues = this._track.cues;
        if (currentCues.length > 0) {
          if (
            firstCue.startTime < currentCues[currentCues.length - 1].startTime
          ) {
            this._remove(firstCue.startTime, +Infinity);
          }
        }

        newCues.forEach((cue) => this._track.addCue(cue));
        this.buffered.insert(
          startTime,
          endTime != null ? endTime : newCues[newCues.length - 1].endTime
        );
      } else if (endTime != null) {
        this.buffered.insert(startTime, endTime);
      }
    }
  }

  /**
   * @param {Number} from
   * @param {Number} to
   */
  _remove(from, to) {
    const track = this._track;
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
    const { _trackElement, _videoElement } = this;
    if (
      _trackElement && _videoElement &&
      _videoElement.hasChildNodes(_trackElement)
    ) {
      _videoElement.removeChild(_trackElement);
    }
    this._track.mode = "disabled";
    this.size = 0;
    this._trackElement = null;
    this._track = null;
    this._videoElement = null;
  }
}

export default TextSourceBuffer;
