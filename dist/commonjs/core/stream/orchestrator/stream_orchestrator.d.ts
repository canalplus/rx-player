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
import type { IManifest, IPeriod } from "../../../manifest";
import type { IReadOnlyPlaybackObserver } from "../../../playback_observer";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import type { CancellationSignal } from "../../../utils/task_canceller";
import type { IRepresentationEstimator } from "../../adaptive";
import type { SegmentFetcherCreator } from "../../fetchers";
import type { IBufferType } from "../../segment_sinks";
import type SegmentSinksStore from "../../segment_sinks";
import type { IPeriodStreamCallbacks, IPeriodStreamOptions, IPeriodStreamPlaybackObservation } from "../period";
/**
 * Create and manage the various "Streams" needed for the content to
 * play:
 *
 *   - Create or dispose SegmentSinks depending on the chosen Adaptations.
 *
 *   - Push the right segments to those SegmentSinks depending on the user's
 *     preferences, the current position, the bandwidth, the decryption
 *     conditions...
 *
 *   - Concatenate Streams for adaptation from separate Periods at the right
 *     time, to allow smooth transitions between periods.
 *
 *   - Call various callbacks to notify of its health and issues
 *
 * @param {Object} content
 * @param {Object} playbackObserver - Emit position information
 * @param {Object} representationEstimator - Emit bitrate estimates and best
 * Representation to play.
 * @param {Object} segmentSinksStore - Will be used to lazily create
 * SegmentSink instances associated with the current content.
 * @param {Object} segmentFetcherCreator - Allow to download segments.
 * @param {Object} options
 * @param {Object} callbacks - The `StreamOrchestrator` relies on a system of
 * callbacks that it will call on various events.
 *
 * Depending on the event, the caller may be supposed to perform actions to
 * react upon some of them.
 *
 * This approach is taken instead of a more classical EventEmitter pattern to:
 *   - Allow callbacks to be called synchronously after the
 *     `StreamOrchestrator` is called.
 *   - Simplify bubbling events up, by just passing through callbacks
 *   - Force the caller to explicitely handle or not the different events.
 *
 * Callbacks may start being called immediately after the `StreamOrchestrator`
 * call and may be called until either the `parentCancelSignal` argument is
 * triggered, or until the `error` callback is called, whichever comes first.
 * @param {Object} orchestratorCancelSignal - `CancellationSignal` allowing,
 * when triggered, to immediately stop all operations the `PeriodStream` is
 * doing.
 */
export default function StreamOrchestrator(content: {
    manifest: IManifest;
    initialPeriod: IPeriod;
}, playbackObserver: IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>, representationEstimator: IRepresentationEstimator, segmentSinksStore: SegmentSinksStore, segmentFetcherCreator: SegmentFetcherCreator, options: IStreamOrchestratorOptions, callbacks: IStreamOrchestratorCallbacks, orchestratorCancelSignal: CancellationSignal): void;
export type IStreamOrchestratorPlaybackObservation = IPeriodStreamPlaybackObservation;
/** Options tweaking the behavior of the StreamOrchestrator. */
export type IStreamOrchestratorOptions = IPeriodStreamOptions & {
    wantedBufferAhead: IReadOnlySharedReference<number>;
    maxVideoBufferSize: IReadOnlySharedReference<number>;
    maxBufferAhead: IReadOnlySharedReference<number>;
    maxBufferBehind: IReadOnlySharedReference<number>;
    /**
     * If `true`, the current device is known to not be able to begin playback of
     * encrypted content if there's already clear content playing.
     */
    failOnEncryptedAfterClear: boolean;
};
/** Callbacks called by the `StreamOrchestrator` on various events. */
export interface IStreamOrchestratorCallbacks extends Omit<IPeriodStreamCallbacks, "waitingMediaSourceReload"> {
    /**
     * Called when a `PeriodStream` has been removed.
     * This event can be used for clean-up purposes. For example, you are free to
     * remove from scope the object used to choose a track for that
     * `PeriodStream`.
     *
     * This callback might not be called when a `PeriodStream` is cleared due to
     * an `error` callback or to the `StreamOrchestrator` being cancellated as
     * both already indicate implicitly that all `PeriodStream` have been cleared.
     */
    periodStreamCleared(payload: IPeriodStreamClearedPayload): void;
    /**
     * Called when a situation needs the MediaSource to be reloaded.
     *
     * Once the MediaSource is reloaded, the `StreamOrchestrator` need to be
     * restarted from scratch.
     */
    needsMediaSourceReload(payload: INeedsMediaSourceReloadPayload): void;
    /**
     * Called when the stream is unable to load segments for a particular Period
     * and buffer type until that Period becomes the currently-played Period.
     *
     * This might be the case for example when a track change happened for an
     * upcoming Period, which necessitates the reloading of the media source
     * once the Period is the current one.
     * Here, the stream might stay in a locked mode for segments linked to that
     * Period and buffer type, meaning it will not load any such segment until that
     * next Period becomes the current one (in which case it will probably ask to
     * reload through the proper callback, `needsMediaSourceReload`).
     *
     * This callback can be useful when investigating rebuffering situation: one
     * might be due to the next Period not loading segment of a certain type
     * because of a locked stream. In that case, playing until or seeking at the
     * start of the corresponding Period should be enough to "unlock" the stream.
     */
    lockedStream(payload: ILockedStreamPayload): void;
    /**
     * Called after the SegmentSink have been "cleaned" to remove from it
     * every non-decipherable segments - usually following an update of the
     * decipherability status of some `Representation`(s).
     *
     * When that event is emitted, the current HTMLMediaElement's buffer might need
     * to be "flushed" to continue (e.g. through a little seek operation) or in
     * worst cases completely removed and re-created through the "reload" mechanism,
     * depending on the platform.
     */
    needsDecipherabilityFlush(): void;
}
/** Payload for the `periodStreamCleared` callback. */
export interface IPeriodStreamClearedPayload {
    /**
     * The type of buffer linked to the `PeriodStream` we just removed.
     *
     * The combination of this and `Period` should give you enough information
     * about which `PeriodStream` has been removed.
     */
    type: IBufferType;
    /** The `Manifest` linked to the `PeriodStream` we just cleared. */
    manifest: IManifest;
    /**
     * The `Period` linked to the `PeriodStream` we just removed.
     *
     * The combination of this and `Period` should give you enough information
     * about which `PeriodStream` has been removed.
     */
    period: IPeriod;
}
/** Payload for the `needsMediaSourceReload` callback. */
export interface INeedsMediaSourceReloadPayload {
    /**
     * Relative position, compared to the current one, at which we should
     * restart playback after reloading. For example `-2` will reload 2 seconds
     * before the current position.
     */
    timeOffset: number;
    /**
     * If defined and if the new position obtained after relying on
     * `timeOffset` is before `minimumPosition`, then we will reload at
     * `minimumPosition`  instead.
     */
    minimumPosition: number | undefined;
    /**
     * If defined and if the new position obtained after relying on
     * `timeOffset` is after `maximumPosition`, then we will reload at
     * `maximumPosition`  instead.
     */
    maximumPosition: number | undefined;
}
/** Payload for the `lockedStream` callback. */
export interface ILockedStreamPayload {
    /** Period concerned. */
    period: IPeriod;
    /** Buffer type concerned. */
    bufferType: IBufferType;
}
//# sourceMappingURL=stream_orchestrator.d.ts.map