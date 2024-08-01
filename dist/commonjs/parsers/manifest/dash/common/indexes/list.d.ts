import type { IRepresentationIndex, ISegment } from "../../../../../manifest";
import type { IEMSG } from "../../../../containers/isobmff";
/**
 * Index property defined for a SegmentList RepresentationIndex
 * This object contains every property needed to generate an ISegment for a
 * given media time.
 */
export interface IListIndex {
    /**
     * Duration of each element in the list, in the timescale given (see
     * timescale and list properties.)
     */
    duration: number;
    /** Byte range for a possible index of segments in the server. */
    indexRange?: [number, number] | undefined;
    /**
     * Temporal offset, in the current timescale (see timescale), to add to the
     * presentation time (time a segment has at decoding time) to obtain the
     * corresponding media time (original time of the media segment in the index
     * and on the media file).
     * For example, to look for a segment beginning at a second `T` on a
     * HTMLMediaElement, we actually will look for a segment in the index
     * beginning at:
     * ```
     * T * timescale + indexTimeOffset
     * ```
     */
    indexTimeOffset: number;
    /** Information on the initialization segment. */
    initialization?: {
        /**
         * URL path, to add to the wanted CDN, to access the initialization segment.
         * `null` if no URL exists.
         */
        url: string | null;
        /** possible byte range to request it. */
        range?: [number, number] | undefined;
    } | undefined;
    /** Information on the list of segments for this index. */
    list: Array<{
        /**
         * URL path, to add to the wanted CDN, to access this media segment.
         * `null` if no URL exists.
         */
        url: string | null;
        /** Possible byte-range of the segment. */
        mediaRange?: [number, number] | undefined;
    }>;
    /**
     * Timescale to convert a time given here into seconds.
     * This is done by this simple operation:
     * ``timeInSeconds = timeInIndex * timescale``
     */
    timescale: number;
}
/**
 * `index` Argument for a SegmentList RepresentationIndex.
 * Most of the properties here are already defined in IListIndex.
 */
export interface IListIndexIndexArgument {
    duration?: number | undefined;
    indexRange?: [number, number] | undefined;
    initialization?: {
        media?: string | undefined;
        range?: [number, number] | undefined;
    };
    list: Array<{
        media?: string | undefined;
        mediaRange?: [number, number] | undefined;
    }>;
    /**
     * Offset present in the index to convert from the mediaTime (time declared in
     * the media segments and in this index) to the presentationTime (time wanted
     * when decoding the segment).  Basically by doing something along the line
     * of:
     * ```
     * presentationTimeInSeconds =
     *   mediaTimeInSeconds -
     *   presentationTimeOffsetInSeconds +
     *   periodStartInSeconds
     * ```
     * The time given here is in the current
     * timescale (see timescale)
     */
    presentationTimeOffset?: number | undefined;
    timescale?: number | undefined;
}
/** Aditional context needed by a SegmentList RepresentationIndex. */
export interface IListIndexContextArgument {
    /** Start of the period concerned by this RepresentationIndex, in seconds. */
    periodStart: number;
    /** End of the period concerned by this RepresentationIndex, in seconds. */
    periodEnd: number | undefined;
    /** ID of the Representation concerned. */
    representationId?: string | undefined;
    /** Bitrate of the Representation concerned. */
    representationBitrate?: number | undefined;
    isEMSGWhitelisted: (inbandEvent: IEMSG) => boolean;
}
export default class ListRepresentationIndex implements IRepresentationIndex {
    /** Underlying structure to retrieve segment information. */
    private _index;
    /** Start of the period concerned by this RepresentationIndex, in seconds. */
    protected _periodStart: number;
    /** End of the period concerned by this RepresentationIndex, in seconds. */
    protected _periodEnd: number | undefined;
    private _isEMSGWhitelisted;
    /**
     * @param {Object} index
     * @param {Object} context
     */
    constructor(index: IListIndexIndexArgument, context: IListIndexContextArgument);
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    getInitSegment(): ISegment;
    /**
     * @param {Number} fromTime
     * @param {Number} dur
     * @returns {Array.<Object>}
     */
    getSegments(fromTime: number, dur: number): ISegment[];
    /**
     * Returns whether the Manifest should be refreshed based on the
     * `ListRepresentationIndex`'s state and the time range the player is
     * currently considering.
     * @param {Number} _fromTime
     * @param {Number} _toTime
     * @returns {Boolean}
     */
    shouldRefresh(_fromTime: number, _toTime: number): boolean;
    /**
     * Returns first position in this index, in seconds.
     * @returns {Number}
     */
    getFirstAvailablePosition(): number;
    /**
     * Returns last position in this index, in seconds.
     * @returns {Number}
     */
    getLastAvailablePosition(): number;
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    getEnd(): number | null;
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     *
     * Always `false` in a `ListRepresentationIndex` because all segments should
     * be directly available.
     * @returns {boolean}
     */
    awaitSegmentBetween(): false;
    /**
     * Returns true if a Segment returned by this index is still considered
     * available.
     * @returns {Boolean}
     */
    isSegmentStillAvailable(): true;
    /**
     * We do not check for discontinuity in SegmentList-based indexes.
     * @returns {null}
     */
    checkDiscontinuity(): null;
    /**
     * SegmentList should not be updated.
     * @returns {Boolean}
     */
    canBeOutOfSyncError(): false;
    /**
     * @returns {Boolean}
     */
    isStillAwaitingFutureSegments(): false;
    /**
     * @returns {Boolean}
     */
    isInitialized(): true;
    initialize(): void;
    addPredictedSegments(): void;
    /**
     * @param {Object} newIndex
     */
    _replace(newIndex: ListRepresentationIndex): void;
    _update(): void;
}
//# sourceMappingURL=list.d.ts.map