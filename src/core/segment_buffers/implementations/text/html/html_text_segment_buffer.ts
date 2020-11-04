/**
 *
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
  defer as observableDefer,
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
import {
  events,
  onHeightWidthChange,
} from "../../../../../compat";
import config from "../../../../../config";
import log from "../../../../../log";
import {
  IEndOfSegmentInfos,
  IPushChunkInfos,
  IPushedChunkData,
  SegmentBuffer,
} from "../../types";
import ManualTimeRanges from "../../utils/manual_time_ranges";
import parseTextTrackToElements from "./parsers";
import TextTrackCuesStore from "./text_track_cues_store";
import updateProportionalElements from "./update_proportional_elements";

const { onEnded$,
        onSeeked$,
        onSeeking$ } = events;

/** Format of the data pushed to the `HTMLTextSegmentBuffer`. */
export interface IHTMLTextTrackData {
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

const { MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL,
        TEXT_TRACK_SIZE_CHECKS_INTERVAL } = config;

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
 * @param {Element} child
 */
function safelyRemoveChild(element : Element, child : Element) {
  try {
    element.removeChild(child);
  } catch (_error) {
    log.warn("HTSB: Can't remove text track: not in the element.");
  }
}

/**
 * @param {HTMLElement} element
 * @returns {Object|null}
 */
function getElementResolution(
  element : HTMLElement
) : { rows : number; columns : number } | null {
  const strRows = element.getAttribute("data-resolution-rows");
  const strColumns = element.getAttribute("data-resolution-columns");
  if (strRows === null || strColumns === null) {
    return null;
  }
  const rows = parseInt(strRows, 10);
  const columns = parseInt(strColumns, 10);
  if (rows === null || columns === null) {
    return null;
  }
  return { rows, columns };
}

/**
 * SegmentBuffer implementation which display buffered TextTracks in the given
 * HTML element.
 * @class HTMLTextSegmentBuffer
 */
export default class HTMLTextSegmentBuffer
                 extends SegmentBuffer<IHTMLTextTrackData>
{
  readonly bufferType : "text";

  /**
   * The video element the cues refer to.
   * Used to know when the user is seeking, for example.
   */
  private readonly _videoElement : HTMLMediaElement;

  /**
   * When "nexting" that subject, every Observable declared here will be
   * unsubscribed.
   * Used for clean-up
   */
  private readonly _destroy$ : Subject<void>;

  /** HTMLElement which will contain the cues */
  private readonly _textTrackElement : HTMLElement;

  /** Buffer containing the data */
  private readonly _buffer : TextTrackCuesStore;

  /**
   * We could need us to automatically update styling depending on
   * `_textTrackElement`'s size. This Subject allows to stop that
   * regular check.
   */
  private _clearSizeUpdates$ : Subject<void>;

  /** Information on the cue currently displayed in `_textTrackElement`. */
  private _currentCue : { element : HTMLElement;
                          resolution : { columns : number;
                                         rows : number; } |
                                       null; } |
                        null;

  private _buffered : ManualTimeRanges;

  /**
   * @param {HTMLMediaElement} videoElement
   * @param {HTMLElement} textTrackElement
   */
  constructor(
    videoElement : HTMLMediaElement,
    textTrackElement : HTMLElement
  ) {
    log.debug("HTSB: Creating HTMLTextSegmentBuffer");
    super();
    this.bufferType = "text";

    this._buffered = new ManualTimeRanges();

    this._videoElement = videoElement;
    this._textTrackElement = textTrackElement;
    this._clearSizeUpdates$ = new Subject();
    this._destroy$ = new Subject();
    this._buffer = new TextTrackCuesStore();
    this._currentCue = null;

    // update text tracks
    generateClock(this._videoElement)
      .pipe(takeUntil(this._destroy$))
      .subscribe((shouldDisplay) => {
        if (!shouldDisplay) {
          this._hideCurrentCue();
          return;
        }

        // to spread the time error, we divide the regular chosen interval.
        const time = Math.max(this._videoElement.currentTime +
                              (MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL / 1000) / 2,
                              0);
        const cue = this._buffer.get(time);
        if (cue === undefined) {
          this._hideCurrentCue();
        } else {
          this._displayCue(cue.element);
        }
      });
  }

  /**
   * Push segment on Subscription.
   * @param {Object} infos
   * @returns {Observable}
   */
  public pushChunk(infos : IPushChunkInfos<IHTMLTextTrackData>) : Observable<void> {
    return observableDefer(() => {
      const hasPushedData = this.pushDataSync(infos.data);
      if (!hasPushedData) {
        return observableOf(undefined);
      }

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
      this.removeBufferSync(start, end);
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
    log.debug("HTSB: Disposing HTMLTextSegmentBuffer");
    this._hideCurrentCue();
    this._buffer.remove(0, Infinity);
    this._buffered.remove(0, Infinity);
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Push the text track contained in `data` to the HTMLTextSegmentBuffer
   * synchronously.
   * Returns a boolean:
   *   - `true` if text tracks have been added the the HTMLTextSegmentBuffer's
   *     buffer after that segment has been added.
   *   - `false` if no text tracks have been added the the
   *     HTMLTextSegmentBuffer's buffer (e.g. empty text-track, incoherent times
   *     etc.)
   *
   * /!\ This method won't add any data to the linked inventory.
   * Please use the `pushChunk` method for most use-cases.
   * @param {Object} data
   * @returns {boolean}
   */
  public pushDataSync(data : IPushedChunkData<IHTMLTextTrackData>) : boolean {
    log.debug("HTSB: Appending new html text tracks");
    const { timestampOffset,
            appendWindow,
            chunk } = data;
    if (chunk === null) {
      return false;
    }

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

    const cues = parseTextTrackToElements(type,
                                          dataString,
                                          timestampOffset,
                                          language);

    if (appendWindowStart !== 0 && appendWindowEnd !== Infinity) {
      // Removing before window start
      let i = 0;
      while (i < cues.length && cues[i].end <= appendWindowStart) {
        i++;
      }
      cues.splice(0, i);

      i = 0;
      while (i < cues.length && cues[i].start < appendWindowStart) {
        cues[i].start = appendWindowStart;
        i++;
      }

      // Removing after window end
      i = cues.length - 1;

      while (i >= 0 && cues[i].start >= appendWindowEnd) {
        i--;
      }
      cues.splice(i, cues.length);

      i = cues.length - 1;
      while (i >= 0 && cues[i].end > appendWindowEnd) {
        cues[i].end = appendWindowEnd;
        i--;
      }
    }

    let start : number;
    if (startTime !== undefined) {
      start = Math.max(appendWindowStart, startTime);
    } else {
      if (cues.length <= 0) {
        log.warn("HTSB: Current text tracks have no cues nor start time. Aborting");
        return false;
      }
      log.warn("HTSB: No start time given. Guessing from cues.");
      start = cues[0].start;
    }

    let end : number;
    if (endTime !== undefined) {
      end = Math.min(appendWindowEnd, endTime);
    } else {
      if (cues.length <= 0) {
        log.warn("HTSB: Current text tracks have no cues nor end time. Aborting");
        return false;
      }
      log.warn("HTSB: No end time given. Guessing from cues.");
      end = cues[cues.length - 1].end;
    }

    if (end <= start) {
      log.warn("HTSB: Invalid text track appended: ",
               "the start time is inferior or equal to the end time.");
      return false;
    }

    this._buffer.insert(cues, start, end);
    this._buffered.insert(start, end);
    return true;
  }

  /**
   * Remove buffer data between the given start and end, synchronously.
   * @param {number} start
   * @param {number} end
   */
  public removeBufferSync(
    start : number,
    end : number
  ) : void {
    log.debug("HTSB: Removing html text track data", start, end);
    this._buffer.remove(start, end);
    this._buffered.remove(start, end);
  }

  /**
   * Remove the current cue from being displayed.
   */
  private _hideCurrentCue() : void {
    this._clearSizeUpdates$.next();
    if (this._currentCue !== null) {
      safelyRemoveChild(this._textTrackElement, this._currentCue.element);
      this._currentCue = null;
    }
  }

  /**
   * Display a new Cue. If one was already present, it will be replaced.
   * @param {HTMLElement} element
   */
  private _displayCue(element : HTMLElement) : void {
    if (this._currentCue !== null && this._currentCue.element === element) {
      return; // we're already good
    }

    this._clearSizeUpdates$.next();
    if (this._currentCue !== null) {
      safelyRemoveChild(this._textTrackElement, this._currentCue.element);
    }

    const resolution = getElementResolution(element);
    this._currentCue = { element, resolution };
    if (resolution !== null) {
      // update propertionally-sized elements periodically
      onHeightWidthChange(this._textTrackElement, TEXT_TRACK_SIZE_CHECKS_INTERVAL)
        .pipe(takeUntil(this._clearSizeUpdates$),
              takeUntil(this._destroy$))
        .subscribe(({ height, width }) => {
          if (this._currentCue !== null && this._currentCue.resolution !== null) {
            const hasProport = updateProportionalElements(height,
                                                          width,
                                                          this._currentCue.resolution,
                                                          this._currentCue.element);
            if (!hasProport) {
              this._clearSizeUpdates$.next();
            }
          }
        });
    }
    this._textTrackElement.appendChild(element);
  }
}
