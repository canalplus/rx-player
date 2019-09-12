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
  concat as observableConcat,
  interval as observableInterval,
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  mapTo,
  startWith,
  switchMapTo,
  takeUntil,
} from "rxjs/operators";
import { events } from "../../../compat";
import config from "../../../config";
import log from "../../../log";
import AbstractSourceBuffer from "../../abstract_source_buffer";
import TextBufferManager from "./buffer_manager";
import parseTextTrackToElements from "./parsers";

const { onEnded$,
        onSeeked$,
        onSeeking$ } = events;

export interface IHTMLTextTrackData {
  data : string; // text track content. Should be a string
  type : string; // type of texttracks (e.g. "ttml" or "vtt")
  timescale : number; // timescale for the start and end
  start? : number; // exact beginning to which the track applies
  end? : number; // exact end to which the track applies
  language? : string; // language the texttrack is in
}

const { MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL } = config;

/**
 * Generate the clock at which TextTrack HTML Cues should be refreshed.
 * @param {HTMLMediaElement} videoElement
 * @returns {Observable}
 */
function generateClock(videoElement : HTMLMediaElement) : Observable<boolean> {
  const seeking$ = onSeeking$(videoElement);
  const seeked$ = onSeeked$(videoElement);
  const ended$ = onEnded$(videoElement);

  const manualRefresh$ = observableMerge(seeked$, ended$);
  const autoRefresh$ = observableInterval(MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL)
                         .pipe(startWith(null));

  return manualRefresh$.pipe(
    startWith(null),
    switchMapTo(observableConcat(autoRefresh$
                                   .pipe(mapTo(true), takeUntil(seeking$)),
                                 observableOf(false))));
}

/**
 * @param {Element} element
 * @param {Element|null} [child]
 */
function safelyRemoveChild(element : Element, child : Element|null) {
  if (child) {
    try {
      element.removeChild(child);
    } catch (e) {
      log.warn("HTSB: Can't remove text track: not in the element.");
    }
  }
}

/**
 * SourceBuffer to display TextTracks in the given HTML element.
 * @class HTMLTextSourceBuffer
 */
export default class HTMLTextSourceBuffer
               extends AbstractSourceBuffer<IHTMLTextTrackData>
{
  private readonly _videoElement : HTMLMediaElement;
  private readonly _destroy$ : Subject<void>;
  private readonly _textTrackElement : HTMLElement;
  private readonly _buffer : TextBufferManager;

  private _currentElement : HTMLElement|null;

  /**
   * @param {HTMLMediaElement} videoElement
   * @param {HTMLElement} textTrackElement
   */
  constructor(
    videoElement : HTMLMediaElement,
    textTrackElement : HTMLElement
  ) {
    log.debug("HTSB: Creating html text track SourceBuffer");
    super();
    this._videoElement = videoElement;
    this._textTrackElement = textTrackElement;
    this._destroy$ = new Subject();
    this._buffer = new TextBufferManager();
    this._currentElement = null;

    generateClock(this._videoElement)
      .pipe(takeUntil(this._destroy$))
      .subscribe((shouldDisplay) => {
        if (!shouldDisplay) {
          safelyRemoveChild(textTrackElement, this._currentElement);
          this._currentElement = null;
          return;
        }

        // to spread the time error, we divide the regular chosen interval.
        // As the clock is also based on real video events, we cannot just
        // divide by two the regular interval.
        const time = Math.max(this._videoElement.currentTime -
                              MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL / 2000,
                              0);
        const cue = this._buffer.get(time);
        if (!cue) {
          safelyRemoveChild(textTrackElement, this._currentElement);
          this._currentElement = null;
          return;
        } else if (this._currentElement === cue.element) {
          return;
        }
        safelyRemoveChild(textTrackElement, this._currentElement);
        this._currentElement = cue.element;
        textTrackElement.appendChild(this._currentElement);
      });
  }

  /**
   * Append text tracks.
   * @param {Object} data
   */
  _append(data : IHTMLTextTrackData) : void {
    log.debug("HTSB: Appending new html text tracks", data);
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

    const cues = parseTextTrackToElements(type,
                                          dataString,
                                          this.timestampOffset,
                                          language);

    if (this.appendWindowStart !== 0 && this.appendWindowEnd !== Infinity) {
      // Removing before window start
      let i = 0;
      while (i < cues.length && cues[i].end <= this.appendWindowStart) {
        i++;
      }
      cues.splice(0, i);

      i = 0;
      while (i < cues.length && cues[i].start < this.appendWindowStart) {
        cues[i].start = this.appendWindowStart;
        i++;
      }

      // Removing after window end
      i = cues.length - 1;

      while (i >= 0 && cues[i].start >= this.appendWindowEnd) {
        i--;
      }
      cues.splice(i, cues.length);

      i = cues.length - 1;
      while (i >= 0 && cues[i].end > this.appendWindowEnd) {
        cues[i].end = this.appendWindowEnd;
        i--;
      }
    }

    let start : number;
    if (startTime != null) {
      start = Math.max(this.appendWindowStart, startTime);
    } else {
      if (cues.length <= 0) {
        log.warn("HTSB: Current text tracks have no cues nor start time. Aborting");
        return;
      }
      log.warn("HTSB: No start time given. Guessing from cues.");
      start = cues[0].start;
    }

    let end : number;
    if (endTime != null) {
      end = Math.min(this.appendWindowEnd, endTime);
    } else {
      if (cues.length <= 0) {
        log.warn("HTSB: Current text tracks have no cues nor end time. Aborting");
        return;
      }
      log.warn("HTSB: No end time given. Guessing from cues.");
      end = cues[cues.length - 1].end;
    }

    if (end <= start) {
      log.warn("HTSB: Invalid text track appended: ",
               "the start time is inferior or equal to the end time.");
      return;
    }

    this._buffer.insert(cues, start, end);
    this.buffered.insert(start, end);
  }

  /**
   * @param {Number} from
   * @param {Number} to
   */
  _remove(from : number, to : number) : void {
    log.debug("HTSB: Removing html text track data", from, to);
    this._buffer.remove(from, to);
    this.buffered.remove(from, to);
  }

  /**
   * Free up ressources from this sourceBuffer
   */
  _abort() : void {
    log.debug("HTSB: Aborting html text track SourceBuffer");
    this._remove(0, Infinity);
    this._destroy$.next();
    this._destroy$.complete();
    safelyRemoveChild(this._textTrackElement, this._currentElement);
  }
}
