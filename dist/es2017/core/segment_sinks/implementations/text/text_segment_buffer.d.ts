import type { ITextDisplayer } from "../../../../main_thread/types";
import type { IRange } from "../../../../utils/ranges";
import type { ICompleteSegmentInfo, IPushChunkInfos, ISBOperation } from "../types";
import { SegmentSink } from "../types";
/**
 * SegmentSink implementation to add text data, most likely subtitles.
 * @class TextSegmentSink
 */
export default class TextSegmentSink extends SegmentSink {
    readonly bufferType: "text";
    private _sender;
    private _pendingOperations;
    /**
     * @param {Object} textDisplayerSender
     */
    constructor(textDisplayerSender: ITextDisplayerInterface);
    /**
     * @param {string} uniqueId
     */
    declareInitSegment(uniqueId: string): void;
    /**
     * @param {string} uniqueId
     */
    freeInitSegment(uniqueId: string): void;
    /**
     * Push text segment to the TextSegmentSink.
     * @param {Object} infos
     * @returns {Promise}
     */
    pushChunk(infos: IPushChunkInfos<unknown>): Promise<IRange[]>;
    /**
     * Remove buffered data.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Promise}
     */
    removeBuffer(start: number, end: number): Promise<IRange[]>;
    /**
     * @param {Object} infos
     * @returns {Promise}
     */
    signalSegmentComplete(infos: ICompleteSegmentInfo): Promise<void>;
    /**
     * @returns {Array.<Object>}
     */
    getPendingOperations(): Array<ISBOperation<unknown>>;
    dispose(): void;
    private _addToOperationQueue;
}
/** Data of chunks that should be pushed to the HTMLTextSegmentSink. */
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
/**
 * Abstraction over an `ITextDisplayer`, making parts of its initial API
 * returning a result asynchronously, to allow a common interface for when
 * the `ITextDisplayerInterface` runs in a main thread or in a WebWorker
 * (considering that an `ITextDisplayer` always run in main thread).
 */
export interface ITextDisplayerInterface {
    /**
     * @see ITextDisplayer
     */
    pushTextData(...args: Parameters<ITextDisplayer["pushTextData"]>): Promise<ReturnType<ITextDisplayer["pushTextData"]>>;
    /**
     * @see ITextDisplayer
     */
    remove(...args: Parameters<ITextDisplayer["removeBuffer"]>): Promise<ReturnType<ITextDisplayer["removeBuffer"]>>;
    /**
     * @see ITextDisplayer
     */
    reset(): void;
    /**
     * @see ITextDisplayer
     */
    stop(): void;
}
//# sourceMappingURL=text_segment_buffer.d.ts.map