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
  defer as observableDefer,
  interval as observableInterval,
  map,
  merge as observableMerge,
  Observable,
  of as observableOf,
  startWith,
  Subject,
  switchMap,
  takeUntil,
} from "rxjs";
import {
  events,
  onHeightWidthChange,
} from "../../../../../compat";
import config from "../../../../../config";
import log from "../../../../../log";
import { ITextTrackSegmentData } from "../../../../../transports";
import {
  IEndOfSegmentInfos,
  IPushChunkInfos,
  SegmentBuffer,
} from "../../types";
import ManualTimeRanges from "../../utils/manual_time_ranges";
import parseTextTrackToElements from "./parsers";
import TextTrackCuesStore from "./text_track_cues_store";
import updateProportionalElements from "./update_proportional_elements";

const { onEnded$,
        onSeeked$,
        onSeeking$ } = events;


/**
 * Generate the interval at which TextTrack HTML Cues should be refreshed.
 * @param {HTMLMediaElement} videoElement
 * @returns {Observable}
 */
function generateRefreshInterval(videoElement : HTMLMediaElement) : Observable<boolean> {
  const seeking$ = onSeeking$(videoElement);
  const seeked$ = onSeeked$(videoElement);
  const ended$ = onEnded$(videoElement);
  const { MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL } = config.getCurrent();
  const manualRefresh$ = observableMerge(seeked$, ended$);
  const autoRefresh$ = observableInterval(MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL)
    .pipe(startWith(null));

  return manualRefresh$.pipe(
    startWith(null),
    switchMap(() => observableConcat(autoRefresh$.pipe(map(() => true),
                                                       takeUntil(seeking$)),
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
export default class HTMLTextSegmentBuffer extends SegmentBuffer {
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

  /** Information on cues currently displayed. */
  private _currentCues : Array<{
    /** The HTMLElement containing the cues, appended to `_textTrackElement`. */
    element : HTMLElement;
    /**
     * Announced resolution for this element.
     * Necessary to properly render proportional sizes.
     */
    resolution : { columns : number;
                   rows : number; } |
                 null;
  }>;

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
    this._currentCues = [];

    // update text tracks
    generateRefreshInterval(this._videoElement)
      .pipe(takeUntil(this._destroy$))
      .subscribe((shouldDisplay) => {
        if (!shouldDisplay) {
          this._disableCurrentCues();
          return;
        }
        const { MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL } = config.getCurrent();
        // to spread the time error, we divide the regular chosen interval.
        const time = Math.max(this._videoElement.currentTime +
                              (MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL / 1000) / 2,
                              0);
        const cues = this._buffer.get(time);
        if (cues.length === 0) {
          this._disableCurrentCues();
        } else {
          this._displayCues(cues);
        }
      });
  }

  /**
   * Push segment on Subscription.
   * @param {Object} infos
   * @returns {Observable}
   */
  public pushChunk(infos : IPushChunkInfos<unknown>) : Observable<void> {
    return observableDefer(() => {
      this.pushChunkSync(infos);
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
    this._disableCurrentCues();
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
  public pushChunkSync(infos : IPushChunkInfos<unknown>) : void {
    log.debug("HTSB: Appending new html text tracks");
    const { timestampOffset,
            appendWindow,
            chunk } = infos.data;
    if (chunk === null) {
      return;
    }

    assertChunkIsTextTrackSegmentData(chunk);
    const { start: startTime,
            end: endTime,
            data: dataString,
            type,
            language } = chunk;

    const appendWindowStart = appendWindow[0] ?? 0;
    const appendWindowEnd = appendWindow[1] ?? Infinity;

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
        return ;
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
        return ;
      }
      log.warn("HTSB: No end time given. Guessing from cues.");
      end = cues[cues.length - 1].end;
    }

    if (end <= start) {
      log.warn("HTSB: Invalid text track appended: ",
               "the start time is inferior or equal to the end time.");
      return ;
    }

    if (infos.inventoryInfos !== null) {
      this._segmentInventory.insertChunk(infos.inventoryInfos);
    }
    this._buffer.insert(cues, start, end);
    this._buffered.insert(start, end);
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
  private _disableCurrentCues() : void {
    this._clearSizeUpdates$.next();
    if (this._currentCues.length > 0) {
      for (let i = 0; i < this._currentCues.length; i++) {
        safelyRemoveChild(this._textTrackElement, this._currentCues[i].element);
      }
      this._currentCues = [];
    }
  }

  /**
   * Display a new Cue. If one was already present, it will be replaced.
   * @param {HTMLElement} element
   */
  private _displayCues(elements : HTMLElement[]) : void {
    const nothingChanged = this._currentCues.length === elements.length &&
      this._currentCues.every((current, index) => current.element === elements[index]);

    if (nothingChanged) {
      return;
    }

    // Remove and re-display everything
    // TODO More intelligent handling

    this._clearSizeUpdates$.next();
    for (let i = 0; i < this._currentCues.length; i++) {
      safelyRemoveChild(this._textTrackElement, this._currentCues[i].element);
    }

    this._currentCues = [];
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const resolution = getElementResolution(element);
      this._currentCues.push({ element, resolution });
      this._textTrackElement.appendChild(element);
    }

    const proportionalCues = this._currentCues
      .filter((cue) : cue is { resolution: { rows : number;
                                             columns : number; };
                               element : HTMLElement; } => cue.resolution !== null);

    if (proportionalCues.length > 0) {
      const { TEXT_TRACK_SIZE_CHECKS_INTERVAL } = config.getCurrent();
      // update propertionally-sized elements periodically
      onHeightWidthChange(this._textTrackElement, TEXT_TRACK_SIZE_CHECKS_INTERVAL)
        .pipe(takeUntil(this._clearSizeUpdates$),
              takeUntil(this._destroy$))
        .subscribe(({ height, width }) => {
          for (let i = 0; i < proportionalCues.length; i++) {
            const { resolution, element } = proportionalCues[i];
            updateProportionalElements(height, width, resolution, element);
          }
        });
    }
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
