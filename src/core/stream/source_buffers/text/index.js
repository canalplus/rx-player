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

import { Subject } from "rxjs/Subject";
import { Observable } from "rxjs/Observable";

import { AbstractSourceBuffer } from "../abstract.js";
import {
  addTextTrack,
  isVTTSupported,
} from "../../../../compat";

import {
  onSeeking$,
  onSeeked$,
  onEnded$,
} from "../../../../compat/events.js";

// XXX TODO Move to config add doc
const MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL = 200;

const HAS_HTML_MODE = __FEATURES__.HTML_TTML;

const TextBufferManager = HAS_HTML_MODE ?
  require("./text_buffer_manager.js").default :
  () => {
    throw new Error("Cannot display HTML subtitles: feature not activated.");
  };

const nativeParsers = {};
const htmlParsers = {};

if (__FEATURES__.NATIVE_TTML) {
  nativeParsers.ttml =
    require("../../../../parsers/texttracks/ttml/native/index.js").default;
}

if (__FEATURES__.NATIVE_SAMI) {
  nativeParsers.sami =
    require("../../../../parsers/texttracks/sami.js").default;
  nativeParsers.smil = nativeParsers.sami;
}

// TODO manage webvtt in mp4. (How is the format for segments?)

if (__FEATURES__.HTML_TTML) {
  htmlParsers.ttml =
    require("../../../../parsers/texttracks/ttml/html/index.js").default;
}

/**
 * Returns true if the given codec is for a WebVTT text track.
 * @param {string} codec
 * @returns {Boolean}
 */
function isVTTFile(codec) {
  return /^text\/vtt/.test(codec);
}

/**
 * @param {string} type
 * @param {string} data
 * @param {string} [language]
 * @returns {Array.<VTTCue>}
 * @throws Error - Throw if no parser is found for the given type
 */
function parseTextTrackToCues(type, data, language) {
  const parser = nativeParsers[type];

  if (!parser) {
    throw new Error("no parser found for the given text track");
  }

  return parser(data, language);
}

/**
 * @param {string} type
 * @param {string} data
 * @param {string} [language]
 * @returns {Array.<Object>}
 * @throws Error - Throw if no parser is found for the given type
 */
function parseTextTrackToElements(type, data, language) {
  const parser = htmlParsers[type];

  if (!parser) {
    throw new Error("no parser found for the given text track");
  }
  return parser(data, language);
}

/**
 * Implementation of a SourceBuffer used for TextTracks.
 * @class TextSourceBuffer
 * @extends AbstractSourceBuffer
 */
class TextSourceBuffer extends AbstractSourceBuffer {
  /**
   * @param {HTMLMediaElement} video
   * @param {string} codec
   * @param {Object} [options={}]
   * @param {string} [options.mode="native"] - Mode in which the source buffer
   * goes:
   *   - "native": use the native <tracks> element from the video tag
   *   - "html": use another element. Allows to display richer subtitles
   * @param {Boolean} hideNativeSubtitle - If true, and if mode is set to
   * "native", the <track> element will be hidden by default.
   * @param {HTMLElement} textTrackElement - If mode is set to "html", this
   * is the element in which texttracks will be displayed.
   *
   * @throws Error - The mode is "html" but no text track element
   * was given.
   */
  constructor(video, codec, {
    mode = "native",
    hideNativeSubtitle = false,
    textTrackElement,
  } = {}) {
    super(codec);

    this._mode = mode;
    this._videoElement = video;
    this._shouldBeCompleteVTTFile = isVTTFile(codec);
    this._destroy$ = new Subject();
    if (mode === "html") {
      if (!(textTrackElement instanceof Element)) {
        throw new Error("html textTrackMode needs a text track element");
      }
      this._buffer = new TextBufferManager();
      this._currentElement = null;
      this._track = null;
      this._trackElement = textTrackElement;

      const seeking$ = onSeeking$(video);
      const seeked$ = onSeeked$(video);
      const ended$ = onEnded$(video);

      const manualRefresh$ = Observable.merge(seeked$, ended$);
      const autoRefresh$ = Observable
        .interval(MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL)
        .startWith(null);

      // TODO Better way to express that
      const shouldDisplay$ = manualRefresh$
        .startWith(null)
        .switchMapTo(
          autoRefresh$.mapTo(true)
            .takeUntil(seeking$)
            .concat(Observable.of(false))
        );

      shouldDisplay$
        .takeUntil(this._destroy$)
        .subscribe((shouldDisplay) => {
          if (!shouldDisplay) {
            textTrackElement.innerHTML = "";
            return;
          }
          const time = video.currentTime;
          const cue = this._buffer.get(time);
          if (!cue) {
            this._currentElement = null;
            textTrackElement.innerHTML = "";
            return;
          } else if (this._currentElement === cue.element) {
            return;
          }
          if (this._currentElement) {
            try {
              textTrackElement.removeChild(this._currentElement);
            } catch (e) {}
          }
          this._currentElement = cue.element;
          textTrackElement.appendChild(this._currentElement);
        });
    } else {
      const {
        track,
        trackElement,
      } = addTextTrack(video, hideNativeSubtitle);
      this._track = track;
      this._trackElement = trackElement;
    }
  }

  /**
   * Append text tracks.
   * @param {Object} data
   * @param {string} data.data
   * @param {string} data.language
   * @param {Number} data.timescale
   * @param {Number} data.start
   * @param {Number|undefined} data.end
   */
  _append(data) {
    const {
      timescale, // timescale for the start and end
      start: timescaledStart, // exact beginning to which the track applies
      end: timescaledEnd, // exact end to which the track applies
      data: dataString, // text track content. Should be a string
      type, // type of texttracks (e.g. "ttml" or "vtt")
      language, // language the texttrack is in
    } = data;
    if (timescaledEnd - timescaledStart <= 0) {
      // this is accepted for error resilience, just skip that case.
      return;
    }

    const startTime = timescaledStart / timescale;
    const endTime = timescaledEnd != null ?
      timescaledEnd / timescale : undefined;

    if (this._mode === "html") {
      const cues = parseTextTrackToElements(type, dataString, language);
      const start = startTime;
      const end = endTime != null ? endTime : cues[cues.length - 1].end;
      this._buffer.insert(cues, start, end);
      this.buffered.insert(start, end);
    } else if (this._shouldBeCompleteVTTFile) {

      if (type !== "vtt") {
        throw new Error("did not receive a vtt file in vtt mode.");

      } else if (isVTTSupported() && this._trackElement) {
        const blob = new Blob([dataString], { type: "text/vtt" });
        const url = URL.createObjectURL(blob);
        this._trackElement.src = url;
        this.buffered.insert(
          startTime,
          endTime != null ? endTime : Number.MAX_VALUE
        );

      } else {
        throw new Error("vtt subtitles not supported in vtt mode.");

      }
    } else { // native mode in non-vtt mode
      const cues = parseTextTrackToCues(type, dataString, language);
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

        cues.forEach((cue) => this._track.addCue(cue));
        this.buffered.insert(
          startTime,
          endTime != null ? endTime : cues[cues.length - 1].endTime
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
    if (this._mode === "native" && this._track) {
      const track = this._track;
      const cues = track.cues;
      for (let i = cues.length - 1; i >= 0; i--) {
        const cue = cues[i];
        const { startTime, endTime } = cue;
        if (startTime >= from && startTime <= to && endTime <= to) {
          track.removeCue(cue);
        }
      }
    }
    this.buffered.remove(from, to);
  }

  _abort() {
    const { _trackElement, _videoElement, _destroy$ } = this;
    _destroy$.next();
    _destroy$.complete();

    if (
      _trackElement && _videoElement &&
      _videoElement.hasChildNodes(_trackElement)
    ) {
      _videoElement.removeChild(_trackElement);
    }

    if (this._track) {
      this._track.mode = "disabled";
      this._track = null;
    }

    if (this._trackElement) {
      this._trackElement.innerHTML = "";
      this._trackElement = null;
    }

    this._currentElement = null;
    this._buffer = null;
    this._videoElement = null;
  }
}

export default TextSourceBuffer;
