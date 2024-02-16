import type { ITextTrackSegmentData } from "../../transports";
import type { IRange } from "../../utils/ranges";
/**
 * Interface for an Object implementing timed text media data rendering at the
 * right time.
 */
export interface ITextDisplayer {
    /**
     * Start/restart `ITextDisplayer` (e.g. when changing text tracks).
     */
    reset(): void;
    /**
     * Add timed text media data to the displayer so it can later be displayed at
     * the right time.
     * @param {Object} infos
     * @returns {Array.<Object>} - Contiguous time ranges where text media data is
     * buffered by the `ITextDisplayer` _AFTER_ the timed media data is pushed.
     */
    pushTextData(infos: ITextDisplayerData): IRange[];
    /**
     * Remove media data corresponding to a given range of time, in seconds.
     * @param {number} start
     * @param {number} end
     * @returns {Array.<Object>} - Contiguous time ranges where text media data is
     * buffered by the `ITextDisplayer` _AFTER_ the removal operation is finished.
     */
    removeBuffer(start: number, end: number): IRange[];
    /**
     * Returns current contiguous time ranges where text media data is buffered by
     * the `ITextDisplayer` currently.
     * @returns {Array.<Object>}
     */
    getBufferedRanges(): IRange[];
    /**
     * Stop the `ITextDisplayer` from running and using resources.
     */
    stop(): void;
}
/** Interface describing a timed text media data "chunk". */
export interface ITextDisplayerData {
    /**
     * Chunk you want to push.
     * This can be the whole decodable segment's data or just a decodable sub-part
     * of it.
     * `null` if you just want to push the initialization segment.
     */
    chunk: ITextTrackSegmentData;
    /**
     * Time offset in seconds to apply to this segment.
     * A `timestampOffset` set to `5` will mean that the segment will be decoded
     * 5 seconds after its decode time which was found from the segment data
     * itself.
     */
    timestampOffset: number;
    /**
     * Append windows for the segment. This is a tuple of two elements.
     *
     * The first indicates the "start append window". The media data of that
     * segment that should have been decoded BEFORE that time (after taking the
     * `timestampOffset` property in consideration) will be ignored.
     * This can be set to `0` or `undefined` to not apply any start append window
     * to that chunk.
     *
     * The second indicates the "end append window". The media data of that
     * segment that should have been decoded AFTER that time (after taking the
     * `timestampOffset` property in consideration) will be ignored.
     * This can be set to `0` or `undefined` to not apply any end append window
     * to that chunk.
     */
    appendWindow: [number | undefined, number | undefined];
}
