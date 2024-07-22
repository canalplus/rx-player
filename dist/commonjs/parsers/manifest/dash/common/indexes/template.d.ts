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
import type { IRepresentationIndex, ISegment } from "../../../../../manifest";
import type { IEMSG } from "../../../../containers/isobmff";
import type ManifestBoundsCalculator from "../manifest_bounds_calculator";
/**
 * Index property defined for a SegmentTemplate RepresentationIndex
 * This object contains every property needed to generate an ISegment for a
 * given media time.
 */
export interface ITemplateIndex {
    /**
     * Duration of each segment, in the timescale given (see timescale property).
     * timescale and list properties.)
     */
    duration: number;
    /**
     * Timescale to convert a time given here into seconds.
     * This is done by this simple operation:
     * ``timeInSeconds = timeInIndex * timescale``
     */
    timescale: number;
    /** Byte range for a possible index of segments in the server. */
    indexRange?: [number, number] | undefined;
    /** Information on the initialization segment. */
    initialization?: {
        /**
         * URL path, to add to the wanted CDN, to access the initialization segment.
         */
        url: string | null;
        /** possible byte range to request it. */
        range?: [number, number] | undefined;
    } | undefined;
    /**
     * URL base to access any segment.
     * Can contain token to replace to convert it to real URLs.
     * `null` if no URL exists.
     */
    url: string | null;
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
    presentationTimeOffset: number;
    /** Number from which the first segments in this index starts with. */
    startNumber?: number | undefined;
    /** Number associated to the last segment in this index. */
    endNumber?: number | undefined;
}
/**
 * `index` Argument for a SegmentTemplate RepresentationIndex.
 * Most of the properties here are already defined in ITemplateIndex.
 */
export interface ITemplateIndexIndexArgument {
    duration?: number | undefined;
    indexRange?: [number, number] | undefined;
    initialization?: {
        media?: string | undefined;
        range?: [number, number] | undefined;
    } | undefined;
    media?: string | undefined;
    presentationTimeOffset?: number | undefined;
    startNumber?: number | undefined;
    endNumber?: number | undefined;
    timescale?: number | undefined;
}
/** Aditional context needed by a SegmentTemplate RepresentationIndex. */
export interface ITemplateIndexContextArgument {
    /**
     * availability time offset of the concerned Adaptation.
     *
     * If `undefined`, the corresponding property was not set in the MPD and it is
     * thus assumed to be equal to `0`.
     * It might however be semantically different than `0` in the RxPlayer as it
     * means that the packager didn't include that information in the MPD.
     */
    availabilityTimeOffset: number | undefined;
    /** Allows to obtain the minimum and maximum positions of a content. */
    manifestBoundsCalculator: ManifestBoundsCalculator;
    /** Start of the period concerned by this RepresentationIndex, in seconds. */
    periodStart: number;
    /** End of the period concerned by this RepresentationIndex, in seconds. */
    periodEnd: number | undefined;
    /** Whether the corresponding Manifest can be updated and changed. */
    isDynamic: boolean;
    /** ID of the Representation concerned. */
    representationId?: string | undefined;
    /** Bitrate of the Representation concerned. */
    representationBitrate?: number | undefined;
    isEMSGWhitelisted: (inbandEvent: IEMSG) => boolean;
}
/**
 * IRepresentationIndex implementation for DASH' SegmentTemplate without a
 * SegmentTimeline.
 * @class TemplateRepresentationIndex
 */
export default class TemplateRepresentationIndex implements IRepresentationIndex {
    /** Underlying structure to retrieve segment information. */
    private _index;
    /** Retrieve the maximum and minimum position of the whole content. */
    private _manifestBoundsCalculator;
    /** Absolute start of the Period, in seconds. */
    private _periodStart;
    /** Difference between the end time of the Period and its start time, in timescale. */
    private _scaledRelativePeriodEnd;
    /** Minimum availabilityTimeOffset concerning the segments of this Representation. */
    private _availabilityTimeOffset;
    /** Whether the corresponding Manifest can be updated and changed. */
    private _isDynamic;
    private _isEMSGWhitelisted;
    /**
     * @param {Object} index
     * @param {Object} context
     */
    constructor(index: ITemplateIndexIndexArgument, context: ITemplateIndexContextArgument);
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
     * Returns first possible position in the index, in seconds.
     * @returns {number|null|undefined}
     */
    getFirstAvailablePosition(): number | null | undefined;
    /**
     * Returns last possible position in the index, in seconds.
     * @returns {number|null}
     */
    getLastAvailablePosition(): number | null | undefined;
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    getEnd(): number | null | undefined;
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     *
     * Always `false` in a `BaseRepresentationIndex` because all segments should
     * be directly available.
     * @returns {boolean}
     */
    awaitSegmentBetween(start: number, end: number): boolean | undefined;
    /**
     * Returns true if, based on the arguments, the index should be refreshed.
     * We never have to refresh a SegmentTemplate-based manifest.
     * @returns {Boolean}
     */
    shouldRefresh(): false;
    /**
     * We cannot check for discontinuity in SegmentTemplate-based indexes.
     * @returns {null}
     */
    checkDiscontinuity(): null;
    /**
     * Returns `true` if the given segment should still be available as of now
     * (not removed since and still request-able).
     * Returns `false` if that's not the case.
     * Returns `undefined` if we do not know whether that's the case or not.
     * @param {Object} segment
     * @returns {boolean|undefined}
     */
    isSegmentStillAvailable(segment: ISegment): boolean | undefined;
    /**
     * SegmentTemplate without a SegmentTimeline should not be updated.
     * @returns {Boolean}
     */
    canBeOutOfSyncError(): false;
    /**
     * Returns `false` if the last segments in this index have already been
     * generated so that we can freely go to the next period.
     * Returns `true` if the index is still waiting on future segments to be
     * generated.
     * @returns {Boolean}
     */
    isStillAwaitingFutureSegments(): boolean;
    /**
     * @returns {Boolean}
     */
    isInitialized(): true;
    initialize(): void;
    addPredictedSegments(): void;
    /**
     * @param {Object} newIndex
     */
    _replace(newIndex: TemplateRepresentationIndex): void;
    /**
     * @param {Object} newIndex
     */
    _update(newIndex: TemplateRepresentationIndex): void;
    /**
     * Returns the timescaled start of the first segment that should be available,
     * relatively to the start of the Period.
     * @returns {number | null | undefined}
     */
    private _getFirstSegmentStart;
    /**
     * Returns the timescaled start of the last segment that should be available,
     * relatively to the start of the Period.
     * Returns null if live time is before current period.
     * @returns {number|null|undefined}
     */
    private _getLastSegmentStart;
    /**
     * Returns an estimate of the last available position in this
     * `RepresentationIndex` based on attributes such as the Period's end and
     * the `endNumber` attribute.
     * If the estimate cannot be made (e.g. this Period's segments are still being
     * generated and its end is yet unknown), returns `undefined`.
     * @returns {number|undefined}
     */
    private _estimateRelativeScaledEnd;
}
//# sourceMappingURL=template.d.ts.map