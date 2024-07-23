import type { IRange } from "../../../utils/ranges";
import type { ITextDisplayer, ITextDisplayerData } from "../types";
/**
 * Implementation of an `ITextDisplayer` for "native" text tracks.
 * "Native" text tracks rely on a `<track>` HTMLElement and its associated
 * expected behavior to display subtitles synchronized to the video.
 * @class NativeTextDisplayer
 */
export default class NativeTextDisplayer implements ITextDisplayer {
    private readonly _videoElement;
    private readonly _track;
    private readonly _trackElement;
    private _buffered;
    /**
     * @param {HTMLMediaElement} videoElement
     */
    constructor(videoElement: HTMLMediaElement);
    /**
     * Push text segment to the NativeTextDisplayer.
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
     * @returns {Array.<Object>}
     */
    getBufferedRanges(): IRange[];
    reset(): void;
    stop(): void;
    private _removeData;
}
/** Data of chunks that should be pushed to the NativeTextDisplayer. */
export interface INativeTextTracksBufferSegmentData {
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
//# sourceMappingURL=native_text_displayer.d.ts.map