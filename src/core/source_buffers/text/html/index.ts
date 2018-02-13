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

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import {
  onEnded$,
  onSeeked$,
  onSeeking$,
} from "../../../../compat/events";
import config from "../../../../config";
import log from "../../../../utils/log";
import AbstractSourceBuffer from "../../abstract_source_buffer";
import TextBufferManager from "./buffer_manager";
import parseTextTrackToElements from "./parsers";

export interface IHTMLTextTrackData {
  timescale : number;
  start : number;
  end? : number;
  data : string;
  type : string;
  language : string;
  timeOffset : number;
}

const {
  MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL,
} = config;

/**
 * Generate the clock at which TextTrack HTML Cues should be refreshed.
 * @param {HTMLMediaElement} videoElement
 * @returns {Observable}
 */
function generateClock(videoElement : HTMLMediaElement) : Observable<boolean> {
  const seeking$ = onSeeking$(videoElement);
  const seeked$ = onSeeked$(videoElement);
  const ended$ = onEnded$(videoElement);

  const manualRefresh$ = Observable.merge(seeked$, ended$);
  const autoRefresh$ = Observable
    .interval(MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL)
    .startWith(null);

  // TODO Better way to express that
  return manualRefresh$
    .startWith(null)
    .switchMapTo(
      autoRefresh$.mapTo(true)
      .takeUntil(seeking$)
      .concat(Observable.of(false))
    );
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
      log.warn("Can't remove text track: not in the element.");
    }
  }
}

/**
 * Source buffer to display TextTracks in the given HTML element.
 * @class HTMLTextTrackSourceBuffer
 */
export default class HTMLTextTrackSourceBuffer
  extends AbstractSourceBuffer<IHTMLTextTrackData>
{
  private _videoElement : HTMLMediaElement;
  private _destroy$ : Subject<void>;
  private _textTrackElement : HTMLElement;

  private _buffer : TextBufferManager;
  private _currentElement : HTMLElement|null;

  /**
   * @param {HTMLMediaElement} videoElement
   * @param {HTMLElement} textTrackElement
   */
  constructor(
    videoElement : HTMLMediaElement,
    textTrackElement : HTMLElement
  ) {
    log.debug("creating html text track source buffer");
    super();
    this._videoElement = videoElement;
    this._textTrackElement = textTrackElement;
    this._destroy$ = new Subject();
    this._buffer = new TextBufferManager();
    this._currentElement = null;

    generateClock(this._videoElement)
      .takeUntil(this._destroy$)
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
          MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL / 3000, 0);
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
   * @param {string} data.type
   * @param {string} data.data
   * @param {string} data.language
   * @param {Number} data.timescale
   * @param {Number} data.start
   * @param {Number} data.timeOffset
   * @param {Number|undefined} data.end
   */
  _append(data : IHTMLTextTrackData) : void {
    log.debug("appending new html text tracks", data);
    const {
      timescale, // timescale for the start and end
      start: timescaledStart, // exact beginning to which the track applies
      end: timescaledEnd, // exact end to which the track applies
      data: dataString, // text track content. Should be a string
      type, // type of texttracks (e.g. "ttml" or "vtt")
      language, // language the texttrack is in
      timeOffset,
    } = data;
    if (timescaledEnd && timescaledEnd - timescaledStart <= 0) {
      // this is accepted for error resilience, just skip that case.
      /* tslint:disable:max-line-length */
      log.warn("Invalid text track appended: the start time is inferior or equal to the end time.");
      /* tslint:enable:max-line-length */
      return;
    }

    const startTime = timescaledStart / timescale;
    const endTime = timescaledEnd != null ?
      timescaledEnd / timescale : undefined;

    const cues = parseTextTrackToElements(
      type, dataString, timeOffset, language);
    const start = startTime;
    const end = endTime != null ? endTime : cues[cues.length - 1].end;
    this._buffer.insert(cues, start, end);
    this.buffered.insert(start, end);
  }

  /**
   * @param {Number} from
   * @param {Number} to
   */
  _remove(from : number, to : number) : void {
    log.debug("removing html text track data", from, to);
    this._buffer.remove(from, to);
  }

  /**
   * Free up ressources from this sourceBuffer
   */
  _abort() : void {
    log.debug("aborting html text track source buffer");
    this._destroy$.next();
    this._destroy$.complete();
    safelyRemoveChild(this._textTrackElement, this._currentElement);
  }
}
