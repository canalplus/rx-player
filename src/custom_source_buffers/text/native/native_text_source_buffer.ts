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

import {
  addTextTrack,
  ICompatTextTrack,
  ICustomSourceBuffer,
} from "../../../compat";
import removeCue from "../../../compat/remove_cue";
import log from "../../../log";
import AbstractSourceBuffer from "../../abstract_source_buffer";
import parseTextTrackToCues from "./parsers";

export interface INativeTextTrackData {
  data : string; // text track content. Should be a string
  type : string; // type of texttracks (e.g. "ttml" or "vtt")
  timescale : number; // timescale for the start and end
  start? : number; // exact beginning to which the track applies
  end? : number; // exact end to which the track applies
  language? : string; // language the texttrack is in
}

/**
 * SourceBuffer to display TextTracks in a <track> element, in the given
 * video element.
 * @class NativeTextSourceBuffer
 * @extends AbstractSourceBuffer
 */
export default class NativeTextSourceBuffer
               extends AbstractSourceBuffer<INativeTextTrackData>
               implements ICustomSourceBuffer<INativeTextTrackData>
{
  private readonly _videoElement : HTMLMediaElement;
  private readonly _track : ICompatTextTrack;
  private readonly _trackElement? : HTMLTrackElement;

  /**
   * @param {HTMLMediaElement} videoElement
   * @param {Boolean} hideNativeSubtitle
   */
  constructor(
    videoElement : HTMLMediaElement,
    hideNativeSubtitle : boolean
  ) {
    log.debug("NTSB: Creating native text track SourceBuffer");
    super();
    const { track,
            trackElement } = addTextTrack(videoElement, hideNativeSubtitle);

    this._videoElement = videoElement;
    this._track = track;
    this._trackElement = trackElement;
  }

  /**
   * Append text tracks.
   * @param {Object} data
   */
  _append(data : INativeTextTrackData) : void {
    log.debug("NTSB: Appending new native text tracks", data);
    const { timescale,
            start: timescaledStart,
            end: timescaledEnd,
            data: dataString,
            type,
            language } = data;

    const startTime = timescaledStart != null ? timescaledStart / timescale :
                                                undefined;
    const endTime = timescaledEnd != null ? timescaledEnd / timescale :
                                            undefined;

    const cues = parseTextTrackToCues(type,
                                      dataString,
                                      this.timestampOffset,
                                      language);

    if (this.appendWindowStart !== 0 && this.appendWindowEnd !== Infinity) {
      // Removing before window start
      let i = 0;
      while (i < cues.length && cues[i].endTime <= this.appendWindowStart) {
        i++;
      }
      cues.splice(0, i);

      i = 0;
      while (i < cues.length && cues[i].startTime < this.appendWindowStart) {
        cues[i].startTime = this.appendWindowStart;
        i++;
      }

      // Removing after window end
      i = cues.length - 1;

      while (i >= 0 && cues[i].startTime >= this.appendWindowEnd) {
        i--;
      }
      cues.splice(i, cues.length);

      i = cues.length - 1;
      while (i >= 0 && cues[i].endTime > this.appendWindowEnd) {
        cues[i].endTime = this.appendWindowEnd;
        i--;
      }
    }

    let start : number;
    if (startTime != null) {
      start = Math.max(this.appendWindowStart, startTime);
    } else {
      if (cues.length <= 0) {
        log.warn("NTSB: Current text tracks have no cues nor start time. Aborting");
        return;
      }
      log.warn("NTSB: No start time given. Guessing from cues.");
      start = cues[0].startTime;
    }

    let end : number;
    if (endTime != null) {
      end = Math.min(this.appendWindowEnd, endTime);
    } else {
      if (cues.length <= 0) {
        log.warn("NTSB: Current text tracks have no cues nor end time. Aborting");
        return;
      }
      log.warn("NTSB: No end time given. Guessing from cues.");
      end = cues[cues.length - 1].endTime;
    }

    if (end <= start) {
      log.warn("NTSB: Invalid text track appended: ",
               "the start time is inferior or equal to the end time.");
      return;
    }

    if (cues.length <= 0) {
      this.buffered.insert(start, end);
      return;
    }

    const firstCue = cues[0];

    // NOTE(compat): cleanup all current cues if the newly added
    // ones are in the past. this is supposed to fix an issue on
    // IE/Edge.
    // TODO Move to compat
    const currentCues = this._track.cues;
    if (currentCues !== null && currentCues.length > 0) {
      if (
        firstCue.startTime < currentCues[currentCues.length - 1].startTime
      ) {
        this._remove(firstCue.startTime, +Infinity);
      }
    }

    for (let i = 0; i < cues.length; i++) {
      this._track.addCue(cues[i]);
    }
    this.buffered.insert(start, end);
  }

  /**
   * @param {Number} from
   * @param {Number} to
   */
  _remove(from : number, to : number) : void {
    log.debug("NTSB: Removing native text track data", from, to);
    const track = this._track;
    const cues = track.cues;
    if (cues != null) {
      for (let i = cues.length - 1; i >= 0; i--) {
        const cue = cues[i];
        const { startTime, endTime } = cue;
        if (startTime >= from && startTime <= to && endTime <= to) {
          removeCue(track, cue);
        }
      }
    }
    this.buffered.remove(from, to);
  }

  _abort() : void {
    log.debug("NTSB: Aborting native text track SourceBuffer");
    this._remove(0, Infinity);
    const { _trackElement,
            _videoElement } = this;

    if (_trackElement !== undefined && _videoElement != null &&
        _videoElement.hasChildNodes()
    ) {
      try {
        _videoElement.removeChild(_trackElement);
      } catch (e) {
        log.warn("NTSB: Can't remove track element from the video");
      }
    }

    if (this._track != null) {
      this._track.mode = "disabled";
    }

    if (this._trackElement != null) {
      this._trackElement.innerHTML = "";
    }
  }
}
