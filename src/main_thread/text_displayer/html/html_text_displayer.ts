import type { IMediaElement } from "../../../compat/browser_compatibility_types";
import { onEnded, onSeeked, onSeeking } from "../../../compat/event_listeners";
import onHeightWidthChange from "../../../compat/on_height_width_change";
import config from "../../../config";
import log from "../../../log";
import type { ITextTrackSegmentData } from "../../../transports";
import type { IRange } from "../../../utils/ranges";
import { convertToRanges } from "../../../utils/ranges";
import type { CancellationSignal } from "../../../utils/task_canceller";
import TaskCanceller from "../../../utils/task_canceller";
import ManualTimeRanges from "../manual_time_ranges";
import type { ITextDisplayer, ITextDisplayerData } from "../types";
import parseTextTrackToElements from "./html_parsers";
import TextTrackCuesStore from "./text_track_cues_store";
import updateProportionalElements from "./update_proportional_elements";

/**
 * @param {Element} element
 * @param {Element} child
 */
function safelyRemoveChild(element: Element, child: Element) {
  try {
    element.removeChild(child);
  } catch (_error) {
    log.warn("HTD: Can't remove text track: not in the element.");
  }
}

/**
 * @param {HTMLElement} element
 * @returns {Object|null}
 */
function getElementResolution(
  element: HTMLElement,
): { rows: number; columns: number } | null {
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
 * TextDisplayer implementation which display buffered TextTracks in the given
 * HTML element.
 * @class HTMLTextDisplayer
 */
export default class HTMLTextDisplayer implements ITextDisplayer {
  /**
   * The video element the cues refer to.
   * Used to know when the user is seeking, for example.
   */
  private readonly _videoElement: IMediaElement;

  /** Allows to cancel the interval at which subtitles are updated. */
  private _subtitlesIntervalCanceller: TaskCanceller;

  /** HTMLElement which will contain the cues */
  private readonly _textTrackElement: HTMLElement;

  /** Buffer containing the data */
  private readonly _buffer: TextTrackCuesStore;

  /**
   * We could need us to automatically update styling depending on
   * `_textTrackElement`'s size. This TaskCanceller allows to stop that
   * regular check.
   */
  private _sizeUpdateCanceller: TaskCanceller;

  /** Information on cues currently displayed. */
  private _currentCues: Array<{
    /** The HTMLElement containing the cues, appended to `_textTrackElement`. */
    element: HTMLElement;
    /**
     * Announced resolution for this element.
     * Necessary to properly render proportional sizes.
     */
    resolution: { columns: number; rows: number } | null;
  }>;

  /** TimeRanges implementation for this buffer. */
  private _buffered: ManualTimeRanges;

  /**
   * If `true`, we're currently automatically refreshing subtitles in intervals
   * (and on some playback events) based on the polled current position.
   *
   * TODO link it to `_subtitlesIntervalCanceller`? Or just use
   * `_subtitlesIntervalCanceller.isUsed`? To check.
   */
  private _isAutoRefreshing: boolean;

  /**
   * @param {HTMLMediaElement} videoElement
   * @param {HTMLElement} textTrackElement
   */
  constructor(videoElement: IMediaElement, textTrackElement: HTMLElement) {
    log.debug("HTD: Creating HTMLTextDisplayer");
    this._buffered = new ManualTimeRanges();

    this._videoElement = videoElement;
    this._textTrackElement = textTrackElement;
    this._sizeUpdateCanceller = new TaskCanceller();
    this._subtitlesIntervalCanceller = new TaskCanceller();
    this._buffer = new TextTrackCuesStore();
    this._currentCues = [];
    this._isAutoRefreshing = false;
  }

  /**
   * Push text segment to the HTMLTextDisplayer.
   * @param {Object} infos
   * @returns {Object}
   */
  public pushTextData(infos: ITextDisplayerData): IRange[] {
    log.debug("HTD: Appending new html text tracks");
    const { timestampOffset, appendWindow, chunk } = infos;
    if (chunk === null) {
      return convertToRanges(this._buffered);
    }

    const { start: startTime, end: endTime, data: dataString, type, language } = chunk;

    const appendWindowStart = appendWindow[0] ?? 0;
    const appendWindowEnd = appendWindow[1] ?? Infinity;

    const cues = parseTextTrackToElements(type, dataString, timestampOffset, language);

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

    let start: number;
    if (startTime !== undefined) {
      start = Math.max(appendWindowStart, startTime);
    } else {
      if (cues.length <= 0) {
        log.warn("HTD: Current text tracks have no cues nor start time. Aborting");
        return convertToRanges(this._buffered);
      }
      log.warn("HTD: No start time given. Guessing from cues.");
      start = cues[0].start;
    }

    let end: number;
    if (endTime !== undefined) {
      end = Math.min(appendWindowEnd, endTime);
    } else {
      if (cues.length <= 0) {
        log.warn("HTD: Current text tracks have no cues nor end time. Aborting");
        return convertToRanges(this._buffered);
      }
      log.warn("HTD: No end time given. Guessing from cues.");
      end = cues[cues.length - 1].end;
    }

    if (end <= start) {
      log.warn(
        "HTD: Invalid text track appended: ",
        "the start time is inferior or equal to the end time.",
      );
      return convertToRanges(this._buffered);
    }
    this._buffer.insert(cues, start, end);
    this._buffered.insert(start, end);
    if (!this._isAutoRefreshing && !this._buffer.isEmpty()) {
      this.autoRefreshSubtitles(this._subtitlesIntervalCanceller.signal);
    }
    return convertToRanges(this._buffered);
  }

  /**
   * Remove buffered data.
   * @param {number} start - start position, in seconds
   * @param {number} end - end position, in seconds
   * @returns {Object}
   */
  public removeBuffer(start: number, end: number): IRange[] {
    log.debug("HTD: Removing html text track data", start, end);
    this._buffer.remove(start, end);
    this._buffered.remove(start, end);
    if (this._isAutoRefreshing && this._buffer.isEmpty()) {
      this.refreshSubtitles();
      this._isAutoRefreshing = false;
      this._subtitlesIntervalCanceller.cancel();
      this._subtitlesIntervalCanceller = new TaskCanceller();
    }
    return convertToRanges(this._buffered);
  }

  /**
   * Returns the currently buffered data, in a TimeRanges object.
   * @returns {TimeRanges}
   */
  public getBufferedRanges(): IRange[] {
    return convertToRanges(this._buffered);
  }

  public reset(): void {
    log.debug("HTD: Resetting HTMLTextDisplayer");
    this.stop();
    this._subtitlesIntervalCanceller = new TaskCanceller();
  }

  public stop(): void {
    if (this._subtitlesIntervalCanceller.isUsed()) {
      return;
    }
    log.debug("HTD: Stopping HTMLTextDisplayer");
    this._disableCurrentCues();
    this._buffer.remove(0, Infinity);
    this._buffered.remove(0, Infinity);
    this._isAutoRefreshing = false;
    this._subtitlesIntervalCanceller.cancel();
  }

  /**
   * Remove the current cue from being displayed.
   */
  private _disableCurrentCues(): void {
    this._sizeUpdateCanceller.cancel();
    if (this._currentCues.length > 0) {
      for (const cue of this._currentCues) {
        safelyRemoveChild(this._textTrackElement, cue.element);
      }
      this._currentCues = [];
    }
  }

  /**
   * Display a new Cue. If one was already present, it will be replaced.
   * @param {HTMLElement} elements
   */
  private _displayCues(elements: HTMLElement[]): void {
    const nothingChanged =
      this._currentCues.length === elements.length &&
      this._currentCues.every((current, index) => current.element === elements[index]);

    if (nothingChanged) {
      return;
    }

    // Remove and re-display everything
    // TODO More intelligent handling

    this._sizeUpdateCanceller.cancel();
    for (const cue of this._currentCues) {
      safelyRemoveChild(this._textTrackElement, cue.element);
    }

    this._currentCues = [];
    for (const element of elements) {
      const resolution = getElementResolution(element);
      this._currentCues.push({ element, resolution });
      this._textTrackElement.appendChild(element);
    }

    const proportionalCues = this._currentCues.filter(
      (
        cue,
      ): cue is {
        resolution: { rows: number; columns: number };
        element: HTMLElement;
      } => cue.resolution !== null,
    );

    if (proportionalCues.length > 0) {
      this._sizeUpdateCanceller = new TaskCanceller();
      this._sizeUpdateCanceller.linkToSignal(this._subtitlesIntervalCanceller.signal);
      const { TEXT_TRACK_SIZE_CHECKS_INTERVAL } = config.getCurrent();
      // update propertionally-sized elements periodically
      const heightWidthRef = onHeightWidthChange(
        this._textTrackElement,
        TEXT_TRACK_SIZE_CHECKS_INTERVAL,
        this._sizeUpdateCanceller.signal,
      );
      heightWidthRef.onUpdate(
        ({ height, width }) => {
          for (const cue of proportionalCues) {
            const { resolution, element } = cue;
            updateProportionalElements(height, width, resolution, element);
          }
        },
        {
          clearSignal: this._sizeUpdateCanceller.signal,
          emitCurrentValue: true,
        },
      );
    }
  }

  /**
   * Auto-refresh the display of subtitles according to the media element's
   * position and events.
   * @param {Object} cancellationSignal
   */
  private autoRefreshSubtitles(cancellationSignal: CancellationSignal): void {
    if (this._isAutoRefreshing || cancellationSignal.isCancelled()) {
      return;
    }
    let autoRefreshCanceller: TaskCanceller | null = null;
    const { MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL } = config.getCurrent();

    const stopAutoRefresh = () => {
      this._isAutoRefreshing = false;
      if (autoRefreshCanceller !== null) {
        autoRefreshCanceller.cancel();
        autoRefreshCanceller = null;
      }
    };
    const startAutoRefresh = () => {
      stopAutoRefresh();
      this._isAutoRefreshing = true;
      autoRefreshCanceller = new TaskCanceller();
      autoRefreshCanceller.linkToSignal(cancellationSignal);
      const intervalId = setInterval(
        () => this.refreshSubtitles(),
        MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL,
      );
      autoRefreshCanceller.signal.register(() => {
        clearInterval(intervalId);
      });
      this.refreshSubtitles();
    };

    onSeeking(
      this._videoElement,
      () => {
        stopAutoRefresh();
        this._disableCurrentCues();
      },
      cancellationSignal,
    );
    onSeeked(this._videoElement, startAutoRefresh, cancellationSignal);
    onEnded(this._videoElement, startAutoRefresh, cancellationSignal);

    startAutoRefresh();
  }

  /**
   * Refresh current subtitles according to the current media element's
   * position.
   */
  private refreshSubtitles(): void {
    const { MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL } = config.getCurrent();
    let time;
    if (this._videoElement.paused || this._videoElement.playbackRate <= 0) {
      time = this._videoElement.currentTime;
    } else {
      // to spread the time error, we divide the regular chosen interval.
      time = Math.max(
        this._videoElement.currentTime +
          MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL / 1000 / 2,
        0,
      );
    }
    const cues = this._buffer.get(time);
    if (cues.length === 0) {
      this._disableCurrentCues();
    } else {
      this._displayCues(cues);
    }
  }
}

/** Data of chunks that should be pushed to the `HTMLTextDisplayer`. */
export interface ITextTracksBufferSegmentData {
  /** The text track data, in the format indicated in `type`. */
  data: string;
  /** The format of `data` (examples: "ttml", "srt" or "vtt") */
  type: string;
  /**
   * Language in which the text track is, as a language code.
   * This is mostly needed for "sami" subtitles, to know which cues can / should
   * be parsed.
   */
  language?: string | undefined;
  /** start time from which the segment apply, in seconds. */
  start?: number | undefined;
  /** end time until which the segment apply, in seconds. */
  end?: number | undefined;
}

/*
 * The following ugly code is here to provide a compile-time check that an
 * `IHTMLTextTracksBufferSegmentData` (type of data pushed to a
 * `HTMLTextDisplayer`) can be derived from a `ITextTrackSegmentData`
 * (text track data parsed from a segment).
 *
 * It doesn't correspond at all to real code that will be called. This is just
 * a hack to tell TypeScript to perform that check.
 */
if ((__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.DEV as number)) {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore
  function _checkType(input: ITextTrackSegmentData): void {
    function checkEqual(_arg: ITextTracksBufferSegmentData): void {
      /* nothing */
    }
    checkEqual(input);
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
  /* eslint-enable @typescript-eslint/ban-ts-comment */
}
