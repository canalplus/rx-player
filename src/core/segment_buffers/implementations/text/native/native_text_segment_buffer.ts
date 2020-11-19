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
  defer as observableDefer,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  addTextTrack,
  ICompatTextTrack,
} from "../../../../../compat";
import removeCue from "../../../../../compat/remove_cue";
import log from "../../../../../log";
import {
  IEndOfSegmentInfos,
  IPushChunkInfos,
  SegmentBuffer,
} from "../../types";
import ManualTimeRanges from "../../utils/manual_time_ranges";
import parseTextTrackToCues from "./parsers";


/** Format of the data pushed to the `NativeTextSegmentBuffer`. */
export interface INativeTextTrackData {
  /** The text track content. Should be a string in the format indicated by `type`. */
  data : string;
  /** The format the text track is in (e.g. "ttml" or "vtt") */
  type : string;
  /** Timescale for the start and end attributes */
  timescale : number;
  /** Exact beginning time to which the track applies. */
  start? : number;
  /** Exact end time to which the track applies. */
  end? : number;
  /**
   * Language the texttrack is in. This is sometimes needed to properly parse
   * the text track. For example for tracks in the "sami" format.
   */
  language? : string;
}

/**
 * Implementation of an SegmentBuffer for "native" text tracks.
 * "Native" text tracks rely on a `<track>` HTMLElement and its associated
 * expected behavior to display subtitles synchronized to the video.
 * @class NativeTextSegmentBuffer
 */
export default class NativeTextSegmentBuffer extends SegmentBuffer<INativeTextTrackData> {
  public readonly bufferType : "text";

  private readonly _videoElement : HTMLMediaElement;
  private readonly _track : ICompatTextTrack;
  private readonly _trackElement? : HTMLTrackElement;

  private _buffered : ManualTimeRanges;

  /**
   * @param {HTMLMediaElement} videoElement
   * @param {Boolean} hideNativeSubtitle
   */
  constructor(
    videoElement : HTMLMediaElement,
    hideNativeSubtitle : boolean
  ) {
    log.debug("NTSB: Creating NativeTextSegmentBuffer");
    super();
    const { track,
            trackElement } = addTextTrack(videoElement, hideNativeSubtitle);

    this.bufferType = "text";

    this._buffered = new ManualTimeRanges();

    this._videoElement = videoElement;
    this._track = track;
    this._trackElement = trackElement;
  }

  /**
   * @param {Object} infos
   * @returns {Observable}
   */
  public pushChunk(infos : IPushChunkInfos<INativeTextTrackData>) : Observable<void> {
    return observableDefer(() => {
      log.debug("NTSB: Appending new native text tracks");
      if (infos.data.chunk === null) {
        return observableOf(undefined);
      }
      const { timestampOffset,
              appendWindow,
              chunk } = infos.data;
      const { timescale,
              start: timescaledStart,
              end: timescaledEnd,
              data: dataString,
              type,
              language } = chunk;
      const appendWindowStart = appendWindow[0] ?? 0;
      const appendWindowEnd = appendWindow[1] ?? Infinity;

      const startTime = timescaledStart !== undefined ? timescaledStart / timescale :
                                                        undefined;
      const endTime = timescaledEnd !== undefined ? timescaledEnd / timescale :
                                                    undefined;

      const cues = parseTextTrackToCues(type, dataString, timestampOffset, language);

      if (appendWindowStart !== 0 && appendWindowEnd !== Infinity) {
        // Removing before window start
        let i = 0;
        while (i < cues.length && cues[i].endTime <= appendWindowStart) {
          i++;
        }
        cues.splice(0, i);

        i = 0;
        while (i < cues.length && cues[i].startTime < appendWindowStart) {
          cues[i].startTime = appendWindowStart;
          i++;
        }

        // Removing after window end
        i = cues.length - 1;

        while (i >= 0 && cues[i].startTime >= appendWindowEnd) {
          i--;
        }
        cues.splice(i, cues.length);

        i = cues.length - 1;
        while (i >= 0 && cues[i].endTime > appendWindowEnd) {
          cues[i].endTime = appendWindowEnd;
          i--;
        }
      }

      let start : number;
      if (startTime !== undefined) {
        start = Math.max(appendWindowStart, startTime);
      } else {
        if (cues.length <= 0) {
          log.warn("NTSB: Current text tracks have no cues nor start time. Aborting");
          return observableOf(undefined);
        }
        log.warn("NTSB: No start time given. Guessing from cues.");
        start = cues[0].startTime;
      }

      let end : number;
      if (endTime !== undefined) {
        end = Math.min(appendWindowEnd, endTime);
      } else {
        if (cues.length <= 0) {
          log.warn("NTSB: Current text tracks have no cues nor end time. Aborting");
          return observableOf(undefined);
        }
        log.warn("NTSB: No end time given. Guessing from cues.");
        end = cues[cues.length - 1].endTime;
      }

      if (end <= start) {
        log.warn("NTSB: Invalid text track appended: ",
                 "the start time is inferior or equal to the end time.");
        return observableOf(undefined);
      }

      if (cues.length > 0) {
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
            this._removeData(firstCue.startTime, +Infinity);
          }
        }

        for (let i = 0; i < cues.length; i++) {
          this._track.addCue(cues[i]);
        }
      }
      this._buffered.insert(start, end);
      if (infos.inventoryInfos !== null) {
        this._segmentInventory.insertChunk(infos.inventoryInfos);
      }
      return observableOf(undefined);
    });
  }

  /**
   * Remove buffered data.
   * @param {number} start - start position, in seconds
   * @param {number} end - end position, in seconds
   * @returns {Observable}
   */
  public removeBuffer(start : number, end : number) : Observable<void> {
    return observableDefer(() => {
      this._removeData(start, end);
      return observableOf(undefined);
    });
  }

  /**
   * Indicate that every chunks from a Segment has been given to pushChunk so
   * far.
   * This will update our internal Segment inventory accordingly.
   * The returned Observable will emit and complete successively once the whole
   * segment has been pushed and this indication is acknowledged.
   * @param {Object} infos
   * @returns {Observable}
   */
  public endOfSegment(_infos : IEndOfSegmentInfos) : Observable<void> {
    return observableDefer(() => {
      this._segmentInventory.completeSegment(_infos);
      return observableOf(undefined);
    });
  }

  /**
   * Returns the currently buffered data, in a TimeRanges object.
   * @returns {TimeRanges}
   */
  public getBufferedRanges() : ManualTimeRanges {
    return this._buffered;
  }

  public dispose() : void {
    log.debug("NTSB: Aborting NativeTextSegmentBuffer");
    this._removeData(0, Infinity);
    const { _trackElement,
            _videoElement } = this;

    if (_trackElement !== undefined && _videoElement.hasChildNodes()) {
      try {
        _videoElement.removeChild(_trackElement);
      } catch (e) {
        log.warn("NTSB: Can't remove track element from the video");
      }
    }

    this._track.mode = "disabled";

    if (this._trackElement !== undefined) {
      this._trackElement.innerHTML = "";
    }
  }

  private _removeData(start : number, end : number) : void {
    log.debug("NTSB: Removing native text track data", start, end);
    const track = this._track;
    const cues = track.cues;
    if (cues !== null) {
      for (let i = cues.length - 1; i >= 0; i--) {
        const cue = cues[i];
        const { startTime, endTime } = cue;
        if (startTime >= start && startTime <= end && endTime <= end) {
          removeCue(track, cue);
        }
      }
    }
    this._buffered.remove(start, end);
  }
}
