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
import type { IAdaptation, IManifest, IPeriod, IRepresentation, ISegment } from "../../manifest";
import type { ObservationPosition, IReadOnlyPlaybackObserver } from "../../playback_observer";
import type { IRange } from "../../utils/ranges";
import type { IReadOnlySharedReference } from "../../utils/reference";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { IBufferType } from "../segment_sinks";
import BandwidthEstimator from "./utils/bandwidth_estimator";
import { IResolutionInfo } from "./utils/filter_by_resolution";
import type { IPendingRequestStoreBegin, IPendingRequestStoreProgress } from "./utils/pending_requests_store";
/**
 * Select the most adapted Representation according to the network and buffer
 * metrics it receives.
 *
 * @param {Object} options - Initial configuration (see type definition)
 * @returns {Object} - Interface allowing to select a Representation.
 * @see IRepresentationEstimator
 */
export default function createAdaptiveRepresentationSelector(options: IAdaptiveRepresentationSelectorArguments): IRepresentationEstimator;
/**
 * Adaptive BitRate estimate object.
 *
 * Helps the player to choose a Representation (i.e. a quality) by frequently
 * measuring the current network and playback conditions.
 *
 * At regular intervals, an `IABREstimate` will be sent to that end.
 */
export interface IABREstimate {
    /**
     * If defined, the last calculated available bitrate for that type of
     * content (e.g. "video, "audio"...).
     * Note that it can be very different from the "real" user's bandwidth.
     *
     * If `undefined`, we do not currently know the bitrate for the current type.
     */
    bitrate: undefined | number;
    /**
     * The Representation considered as the most adapted to the current network
     * and playback conditions.
     * `null` in the rare occurence where there is no `Representation` to choose
     * from.
     */
    representation: IRepresentation | null;
    /**
     * If `true`, the current `representation` suggested should be switched to as
     * soon as possible. For example, you might want to interrupt all pending
     * downloads for the current representation and replace it immediately by this
     * one.
     *
     * If `false`, the suggested `representation` can be switched to less
     * urgently. For example, pending segment requests for the current
     * Representation can be finished before switching to that new Representation.
     */
    urgent: boolean;
    /**
     * Last bitrate which was known to be "maintainable".
     *
     * The estimates provided though `IABREstimate` objects sometimes indicate
     * that you should switch to a Representation with a much higher bitrate than
     * what the network bandwidth can sustain.
     * Such Representation are said to not be "maintainable": at a regular
     * playback speed, we cannot maintain this Representation without buffering
     * after some time.
     *
     * `knownStableBitrate` communicates the bitrate of the last Representation
     * that was known to be maintaninable: it could reliably be played continually
     * without interruption.
     *
     * This can be for example useful in some optimizations such as
     * "fast-switching", where the player will load segments of higher quality to
     * replace segments of low quality.
     * Because in that case you're pushing segment on top of buffer you already
     * have, you will most likely only want to do it when the Representation is
     * known to be maintaninable.
     */
    knownStableBitrate?: number | undefined;
}
/** Media properties `getEstimateReference` will need to keep track of. */
export interface IRepresentationEstimatorPlaybackObservation {
    /**
     * For the concerned media buffer, difference in seconds between the next
     * position where no segment data is available and the current position.
     */
    bufferGap: number;
    /**
     * Information on the current media position in seconds at the time of a
     * Playback Observation.
     */
    position: ObservationPosition;
    /**
     * Last "playback rate" set by the user. This is the ideal "playback rate" at
     * which the media should play.
     */
    speed: number;
    /** `duration` property of the HTMLMediaElement on which the content plays. */
    duration: number;
    /** Theoretical maximum position on the content that can currently be played. */
    maximumPosition: number;
}
/** Content of the `IABRMetricsEvent` event's payload. */
export interface IMetricsCallbackPayload {
    /** Time the request took to perform the request, in milliseconds. */
    requestDuration: number;
    /** Amount of bytes downloaded with this request. */
    size: number;
    /** Duration of the loaded segment, in seconds. */
    segmentDuration: number | undefined;
    /** Context about the segment downloaded. */
    content: {
        representation: IRepresentation;
        adaptation: IAdaptation;
        segment: ISegment;
    };
}
export type IRequestBeginCallbackPayload = IPendingRequestStoreBegin;
export type IRequestProgressCallbackPayload = IPendingRequestStoreProgress;
export interface IRequestEndCallbackPayload {
    /**
     * Same `id` value used to identify that request at the time the corresponding
     * callback was called.
     */
    id: string;
}
/** Object allowing to filter some Representations out based on different attributes. */
export interface IABRFiltersObject {
    /**
     * Filters out all Representations with a bitrate higher than this value.
     * If all Representations have a bitrate higher than this value, still
     * consider the Representation with the lowest bitrate.
     */
    bitrate?: number;
    /**
     * Consider only Representations with a width either unknown or lower or equal
     * to that value.
     *
     * As a special case, if no Representation has a width exactly equal to that
     * value, the Representation(s) with the `width` immediately higher will also
     * be considered.
     *
     * _This is usually used to filter out Representations for which the width
     * is much higher than the maximum width of the screen. In such cases, there
     * would be no difference between those higher-quality Representations._
     */
    width?: number;
}
/** Callbacks returned by `getEstimateReference`. */
export interface IRepresentationEstimatorCallbacks {
    /** Callback to call when a segment has been completely pushed to the buffer. */
    addedSegment(val: IAddedSegmentCallbackPayload): void;
    /** Callback to call when network metrics are available. */
    metrics(val: IMetricsCallbackPayload): void;
    /** Callback to call when an HTTP(S) request begins. */
    requestBegin(val: IRequestBeginCallbackPayload): void;
    /**
     * Callback to call when an HTTP(S) request ends.
     * Important: `requestEnd` should only be called for requests for which the
     * `requestBegin` callback has been called. It should be called at most once.
     */
    requestEnd(val: IRequestEndCallbackPayload): void;
    /**
     * Callback to call when progress information is available on a pending
     * request.
     * Important: `requestProgress` should only be called for requests for which
     * the `requestBegin` callback has been called but the `requestEnd` method has
     * not yet been called.
     */
    requestProgress(val: IRequestProgressCallbackPayload): void;
}
export interface IAddedSegmentCallbackPayload {
    /**
     * The buffered ranges of the related media buffer after that segment has
     * been pushed.
     */
    buffered: IRange[];
    /** The context for the segment that has been pushed. */
    content: {
        representation: IRepresentation;
    };
}
/** Arguments to give to `getEstimateReference`. */
export interface IRepresentationEstimatorArguments {
    /** Class allowing to estimate the current network bandwidth. */
    bandwidthEstimator: BandwidthEstimator;
    /** Emit regular playback information. */
    playbackObserver: IReadOnlyPlaybackObserver<IRepresentationEstimatorPlaybackObservation>;
    /**
     * The Representation currently loaded.
     * `null` if no Representation is currently loaded.
     */
    currentRepresentation: IReadOnlySharedReference<IRepresentation | null>;
    /** Throttle Representation pool according to filters. */
    filters: {
        limitResolution: IReadOnlySharedReference<IResolutionInfo | undefined>;
        throttleBitrate: IReadOnlySharedReference<number>;
    };
    /**
     * The initial bitrate you want to start with.
     *
     * The highest-quality Representation with a bitrate lower-or-equal to that
     * value will be chosen.
     * If no Representation has bitrate lower or equal to that value, the
     * Representation with the lowest bitrate will be chosen instead.
     */
    initialBitrate?: number;
    /**
     * If `true` the content is a "low-latency" content.
     * Such contents have specific settings.
     */
    lowLatencyMode: boolean;
    /** The list of Representations `getEstimateReference` can choose from. */
    representations: IReadOnlySharedReference<IRepresentation[]>;
    /** Context for the list of Representations to choose. */
    context: {
        /** In which Manifest the Representations are. */
        manifest: IManifest;
        /** In which Period the Representations are. */
        period: IPeriod;
        /** In which Adaptation the Representations are. */
        adaptation: IAdaptation;
    };
}
/**
 * Type of the function returned by `createAdaptiveRepresentationSelector`,
 * allowing to estimate the most adapted `Representation`.
 */
export type IRepresentationEstimator = (
/** Information on the content for which a Representation will be chosen */
context: {
    manifest: IManifest;
    period: IPeriod;
    adaptation: IAdaptation;
}, 
/** Reference emitting the Representation currently loaded. */
currentRepresentation: IReadOnlySharedReference<IRepresentation | null>, 
/** Reference emitting the list of available Representations to choose from. */
representations: IReadOnlySharedReference<IRepresentation[]>, 
/** Regularly emits playback conditions */
playbackObserver: IReadOnlyPlaybackObserver<IRepresentationEstimatorPlaybackObservation>, 
/**
 * After this `CancellationSignal` emits, resources will be disposed and
 * estimates will stop to be emitted.
 */
stopAllEstimates: CancellationSignal) => IRepresentationEstimatorResponse;
/** Value returned by an `IRepresentationEstimator` */
export interface IRepresentationEstimatorResponse {
    /**
     * Regularly produces estimates of the best Representation to play (from the
     * list given).
     */
    estimates: IReadOnlySharedReference<IABREstimate>;
    /**
     * Callback which need to be called as soon as the corresponding events to
     * obtain accurate Representation estimates.
     */
    callbacks: IRepresentationEstimatorCallbacks;
}
/** Arguments received by `createAdaptiveRepresentationSelector`. */
export interface IAdaptiveRepresentationSelectorArguments {
    /** Initial bitrate chosen, per type (minimum if not set) */
    initialBitrates: Partial<Record<IBufferType, number>>;
    /**
     * Some settings can depend on wether you're playing a low-latency content.
     * Set it to `true` if you're playing such content.
     */
    lowLatencyMode: boolean;
    /** Allows to filter which Representations can be choosen. */
    throttlers: IRepresentationEstimatorThrottlers;
}
/**
 * Throttlers are interfaces allowing to limit the pool of Representations
 * to choose from.
 */
export interface IRepresentationEstimatorThrottlers {
    /** Limit Representations based on maximum authorized resolution. */
    limitResolution: Partial<Record<IBufferType, IReadOnlySharedReference<IResolutionInfo>>>;
    /** Limit Representations based on maximum authorized bitrate. */
    throttleBitrate: Partial<Record<IBufferType, IReadOnlySharedReference<number>>>;
}
export { IResolutionInfo };
