import type { IRange } from "../../../utils/ranges";
import type { ITextDisplayer, ITextDisplayerData } from "../types";
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
    private readonly _videoElement;
    /** Allows to cancel the interval at which subtitles are updated. */
    private _subtitlesIntervalCanceller;
    /** HTMLElement which will contain the cues */
    private readonly _textTrackElement;
    /** Buffer containing the data */
    private readonly _buffer;
    /**
     * We could need us to automatically update styling depending on
     * `_textTrackElement`'s size. This TaskCanceller allows to stop that
     * regular check.
     */
    private _sizeUpdateCanceller;
    /** Information on cues currently displayed. */
    private _currentCues;
    /** TimeRanges implementation for this buffer. */
    private _buffered;
    /**
     * If `true`, we're currently automatically refreshing subtitles in intervals
     * (and on some playback events) based on the polled current position.
     *
     * TODO link it to `_subtitlesIntervalCanceller`? Or just use
     * `_subtitlesIntervalCanceller.isUsed`? To check.
     */
    private _isAutoRefreshing;
    /**
     * @param {HTMLMediaElement} videoElement
     * @param {HTMLElement} textTrackElement
     */
    constructor(videoElement: HTMLMediaElement, textTrackElement: HTMLElement);
    /**
     * Push text segment to the HTMLTextDisplayer.
     * @param {Object} infos
     * @returns {Object}
     */
    pushTextData(infos: ITextDisplayerData): IRange[];
    /**
     * Remove buffered data.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Object}
     */
    removeBuffer(start: number, end: number): IRange[];
    /**
     * Returns the currently buffered data, in a TimeRanges object.
     * @returns {TimeRanges}
     */
    getBufferedRanges(): IRange[];
    reset(): void;
    stop(): void;
    /**
     * Remove the current cue from being displayed.
     */
    private _disableCurrentCues;
    /**
     * Display a new Cue. If one was already present, it will be replaced.
     * @param {HTMLElement} elements
     */
    private _displayCues;
    /**
     * Auto-refresh the display of subtitles according to the media element's
     * position and events.
     * @param {Object} cancellationSignal
     */
    private autoRefreshSubtitles;
    /**
     * Refresh current subtitles according to the current media element's
     * position.
     */
    private refreshSubtitles;
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
//# sourceMappingURL=html_text_displayer.d.ts.map