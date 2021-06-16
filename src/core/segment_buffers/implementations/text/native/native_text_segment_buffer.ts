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
import { ITextTrackSegmentData } from "../../../../../transports";
import {
  IEndOfSegmentInfos,
  IPushChunkInfos,
  SegmentBuffer,
} from "../../types";
import ManualTimeRanges from "../../utils/manual_time_ranges";
import parseTextTrackToCues from "./parsers";

/**
 * Implementation of an SegmentBuffer for "native" text tracks.
 * "Native" text tracks rely on a `<track>` HTMLElement and its associated
 * expected behavior to display subtitles synchronized to the video.
 * @class NativeTextSegmentBuffer
 */
export default class NativeTextSegmentBuffer extends SegmentBuffer {
  public readonly bufferType : "text";

  private readonly _videoElement : HTMLMediaElement;
  private readonly _track : ICompatTextTrack;
  private readonly _trackElement : HTMLTrackElement | undefined;

  private _buffered : ManualTimeRanges;

  /**
   * @param {HTMLMediaElement} videoElement
   */
  constructor(videoElement : HTMLMediaElement) {
    log.debug("NTSB: Creating NativeTextSegmentBuffer");
    super();
    const { track, trackElement } = addTextTrack(videoElement);

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
  public pushChunk(infos : IPushChunkInfos<unknown>) : Observable<void> {
    return observableDefer(() => {
      log.debug("NTSB: Appending new native text tracks");
      if (infos.data.chunk === null) {
        return observableOf(undefined);
      }
      const { timestampOffset,
              appendWindow,
              chunk } = infos.data;
      assertChunkIsTextTrackSegmentData(chunk);
      const { start: startTime,
              end: endTime,
              data: dataString,
              type,
              language } = chunk;
      const appendWindowStart = appendWindow[0] ?? 0;
      const appendWindowEnd = appendWindow[1] ?? Infinity;

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
      this._segmentInventory.completeSegment(_infos, this._buffered);
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

/** Data of chunks that should be pushed to the NativeTextSegmentBuffer. */
export interface INativeTextTracksBufferSegmentData {
  /** The text track data, in the format indicated in `type`. */
  data : string;
  /** The format of `data` (examples: "ttml", "srt" or "vtt") */
  type : string;
  /**
   * Language in which the text track is, as a language code.
   * This is mostly needed for "sami" subtitles, to know which cues can / should
   * be parsed.
   */
  language? : string | undefined;
  /** start time from which the segment apply, in seconds. */
  start? : number | undefined;
  /** end time until which the segment apply, in seconds. */
  end? : number | undefined;
}

/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 * @param {Object} chunk
 */
function assertChunkIsTextTrackSegmentData(
  chunk : unknown
) : asserts chunk is INativeTextTracksBufferSegmentData {
  if (__ENVIRONMENT__.CURRENT_ENV === __ENVIRONMENT__.PRODUCTION as number) {
    return;
  }
  if (
    typeof chunk !== "object" ||
    chunk === null ||
    typeof (chunk as INativeTextTracksBufferSegmentData).data !== "string" ||
    typeof (chunk as INativeTextTracksBufferSegmentData).type !== "string" ||
    (
      (chunk as INativeTextTracksBufferSegmentData).language !== undefined &&
      typeof (chunk as INativeTextTracksBufferSegmentData).language !== "string"
    ) ||
    (
      (chunk as INativeTextTracksBufferSegmentData).start !== undefined &&
      typeof (chunk as INativeTextTracksBufferSegmentData).start !== "number"
    ) ||
    (
      (chunk as INativeTextTracksBufferSegmentData).end !== undefined &&
      typeof (chunk as INativeTextTracksBufferSegmentData).end !== "number"
    )
  ) {
    throw new Error("Invalid format given to a NativeTextSegmentBuffer");
  }
}

/*
 * The following ugly code is here to provide a compile-time check that an
 * `INativeTextTracksBufferSegmentData` (type of data pushed to a
 * `NativeTextSegmentBuffer`) can be derived from a `ITextTrackSegmentData`
 * (text track data parsed from a segment).
 *
 * It doesn't correspond at all to real code that will be called. This is just
 * a hack to tell TypeScript to perform that check.
 */
if (__ENVIRONMENT__.CURRENT_ENV === __ENVIRONMENT__.DEV as number) {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore
  function _checkType(
    input : ITextTrackSegmentData
  ) : void {
    function checkEqual(_arg : INativeTextTracksBufferSegmentData) : void {
      /* nothing */
    }
    checkEqual(input);
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
  /* eslint-enable @typescript-eslint/ban-ts-comment */
}
