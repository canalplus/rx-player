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
} from "../../../../compat";
import removeCue from "../../../../compat/remove_cue";
import log from "../../../../log";
import AbstractSourceBuffer from "../../abstract_source_buffer";
import parseTextTrackToCues from "./parsers";

export interface INativeTextTrackData {
  data : string;
  language : string;
  timescale : number;
  start: number;
  end? : number;
  type : string;
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
    const {
      track,
      trackElement,
    } = addTextTrack(videoElement, hideNativeSubtitle);

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
    const {
      timescale, // timescale for the start and end
      start: timescaledStart, // exact beginning to which the track applies
      end: timescaledEnd, // exact end to which the track applies
      data: dataString, // text track content. Should be a string
      type, // type of texttracks (e.g. "ttml" or "vtt")
      language, // language the texttrack is in
    } = data;
    if (timescaledEnd != null && timescaledEnd - timescaledStart <= 0) {
      // this is accepted for error resilience, just skip that case.
      log.warn("NTSB: Invalid subtitles appended");
      return;
    }

    const startTime = timescaledStart / timescale;
    const endTime = timescaledEnd != null ? timescaledEnd / timescale : undefined;

    const cues = parseTextTrackToCues(type, dataString, this.timestampOffset, language);
    if (cues.length > 0) {
      const firstCue = cues[0];

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

      for (let i = 0; i < cues.length; i++) {
        this._track.addCue(cues[i]);
      }
      this.buffered.insert(
        startTime,
        endTime != null ? endTime : cues[cues.length - 1].endTime
      );
    } else if (endTime != null) {
      this.buffered.insert(startTime, endTime);
    }
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
    const {
      _trackElement,
      _videoElement,
    } = this;

    if (
      _trackElement && _videoElement &&
      _videoElement.hasChildNodes()
    ) {
      try {
        _videoElement.removeChild(_trackElement);
      } catch (e) {
        log.warn("NTSB: Can't remove track element from the video");
      }
    }

    if (this._track) {
      this._track.mode = "disabled";
    }

    if (this._trackElement) {
      this._trackElement.innerHTML = "";
    }
  }
}
