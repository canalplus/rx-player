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
import { events } from "../../../../compat";
import config from "../../../../config";
import log from "../../../../log";
import AbstractSourceBuffer from "../../abstract_source_buffer";
import TimedDataBufferManager from "./buffer_manager";
import parseTextTrackToElements from "./parsers";

const { onEnded$,
        onSeeked$,
        onSeeking$ } = events;

export interface IHTMLTextTrackData { timescale : number;
                                      start : number;
                                      end? : number;
                                      data : string;
                                      type : string;
                                      language : string; }

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
  private readonly _buffer : TimedDataBufferManager<HTMLElement>;

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
    this._buffer = new TimedDataBufferManager();
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
        } else if (this._currentElement === cue.data) {
          return;
        }
        safelyRemoveChild(textTrackElement, this._currentElement);
        this._currentElement = cue.data;
        textTrackElement.appendChild(this._currentElement);
      });
  }

  /**
   * Append text tracks.
   * @param {Object} data
   */
  _append(data : IHTMLTextTrackData) : void {
    log.debug("HTSB: Appending new html text tracks", data);
    const {
      timescale, // timescale for the start and end
      start: timescaledStart, // exact beginning to which the track applies
      end: timescaledEnd, // exact end to which the track applies
      data: dataString, // text track content. Should be a string
      type, // type of texttracks (e.g. "ttml" or "vtt")
      language, // language the texttrack is in
    } = data;
    if (timescaledEnd && timescaledEnd - timescaledStart <= 0) {
      // this is accepted for error resilience, just skip that case.
      /* tslint:disable:max-line-length */
      log.warn("HTSB: Invalid text track appended: the start time is inferior or equal to the end time.");
      /* tslint:enable:max-line-length */
      return;
    }

    const startTime = timescaledStart / timescale;
    const endTime = timescaledEnd != null ? timescaledEnd / timescale :
                                            undefined;

    const cues = parseTextTrackToElements(type,
                                          dataString,
                                          this.timestampOffset,
                                          language);
    const start = startTime;
    const end = endTime != null ? endTime :
                                  cues[cues.length - 1].end;

    const formattedData = cues.map((cue) =>
      ({ start: cue.start, end: cue.end, data: cue.element, }));
    this._buffer.insert(formattedData, start, end);
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
