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
import type { IStreamOrchestratorPlaybackObservation, IBufferType } from "../../../core/types";
import type { IManifest, IAdaptation, IPeriod } from "../../../manifest";
import type { IReadOnlyPlaybackObserver } from "../../../playback_observer";
import type { IPlayerError } from "../../../public_types";
import EventEmitter from "../../../utils/event_emitter";
/**
 * Observes what's being played and take care of media events relating to time
 * boundaries:
 *   - Emits a `endingPositionChange` when the known maximum playable position
 *     of the current content is known and every time it changes.
 *   - Emits `endOfStream` API once segments have been pushed until the end and
 *     `resumeStream` if downloads starts back.
 *   - Emits a `periodChange` event when the currently-playing Period seemed to
 *     have changed.
 *   - emit "warning" events when what is being played is outside of the
 *     Manifest range.
 * @class ContentTimeBoundariesObserver
 */
export default class ContentTimeBoundariesObserver extends EventEmitter<IContentTimeBoundariesObserverEvent> {
    /** Allows to interrupt everything the `ContentTimeBoundariesObserver` is doing. */
    private _canceller;
    /** Store information on every created "Streams". */
    private _activeStreams;
    /** The `Manifest` object linked to the current content. */
    private _manifest;
    /** Allows to calculate at any time maximum positions of the content */
    private _maximumPositionCalculator;
    /** Enumerate all possible buffer types in the current content. */
    private _allBufferTypes;
    /**
     * Stores the `id` property of the last Period for which a `periodChange`
     * event has been sent.
     * Allows to avoid multiple times in a row `periodChange` for the same
     * Period.
     */
    private _lastCurrentPeriodId;
    /**
     * @param {Object} manifest
     * @param {Object} playbackObserver
     */
    constructor(manifest: IManifest, playbackObserver: IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>, bufferTypes: IBufferType[]);
    /**
     * Returns an estimate of the current last position which may be played in
     * the content at the moment.
     * @returns {Object}
     */
    getCurrentEndingTime(): IEndingPositionInformation;
    /**
     * Method to call any time an Adaptation has been selected.
     *
     * That Adaptation switch will be considered as active until the
     * `onPeriodCleared` method has been called for the same `bufferType` and
     * `Period`, or until `dispose` is called.
     * @param {string} bufferType - The type of buffer concerned by the Adaptation
     * switch
     * @param {Object} period - The Period concerned by the Adaptation switch
     * @param {Object|null} adaptation - The Adaptation selected. `null` if the
     * absence of `Adaptation` has been explicitely selected for this Period and
     * buffer type (e.g. no video).
     */
    onAdaptationChange(bufferType: IBufferType, period: IPeriod, adaptation: IAdaptation | null): void;
    /**
     * Method to call any time a Representation has been selected.
     *
     * That Representation switch will be considered as active until the
     * `onPeriodCleared` method has been called for the same `bufferType` and
     * `Period`, or until `dispose` is called.
     * @param {string} bufferType - The type of buffer concerned by the
     * Representation switch
     * @param {Object} period - The Period concerned by the Representation switch
     */
    onRepresentationChange(bufferType: IBufferType, period: IPeriod): void;
    /**
     * Method to call any time a Period and type combination is not considered
     * anymore.
     *
     * Calling this method allows to signal that a previous Adaptation and/or
     * Representation change respectively indicated by an `onAdaptationChange` and
     * an `onRepresentationChange` call, are not active anymore.
     * @param {string} bufferType - The type of buffer concerned
     * @param {Object} period - The Period concerned
     */
    onPeriodCleared(bufferType: IBufferType, period: IPeriod): void;
    /**
     * Method to call when the last chronological segment for a given buffer type
     * is known to have been loaded and is either pushed or in the process of
     * being pushed to the corresponding MSE `SourceBuffer` or equivalent.
     *
     * This method can even be called multiple times in a row as long as the
     * aforementioned condition is true, if it simplify your code's management.
     * @param {string} bufferType
     */
    onLastSegmentFinishedLoading(bufferType: IBufferType): void;
    /**
     * Method to call to "cancel" a previous call to
     * `onLastSegmentFinishedLoading`.
     *
     * That is, calling this method indicates that the last chronological segment
     * of a given buffer type is now either not loaded or it is not known.
     *
     * This method can even be called multiple times in a row as long as the
     * aforementioned condition is true, if it simplify your code's management.
     * @param {string} bufferType
     */
    onLastSegmentLoadingResume(bufferType: IBufferType): void;
    /**
     * Free all resources used by the `ContentTimeBoundariesObserver` and cancels
     * all recurring processes it performs.
     */
    dispose(): void;
    private _addActivelyLoadedPeriod;
    private _removeActivelyLoadedPeriod;
    private _checkCurrentPeriod;
    private _getManifestEndTime;
    private _lazilyCreateActiveStreamInfo;
    private _checkEndOfStream;
}
export interface IEndingPositionInformation {
    /**
     * The new maximum known position (note that this is the ending position
     * currently known of the current content, it might be superior to the last
     * position at which segments are available and it might also evolve over
     * time), in seconds.
     */
    endingPosition: number;
    /**
     * If `true`, the communicated `endingPosition` is the actual end of the content.
     * It may still be updated due to a track change or to add precision, but it
     * is still a (rough) estimate of the maximum position that content should
     * have.
     *
     * If `false`, this is the currently known maximum position associated to
     * the content, but the content is still evolving (typically, new media
     * segments are still being generated) and as such it can still have a
     * longer `endingPosition` in the future.
     */
    isEnd: boolean;
}
/**
 * Events triggered by a `ContentTimeBoundariesObserver` where the keys are the
 * event names and the value is the payload of those events.
 */
export interface IContentTimeBoundariesObserverEvent {
    /** Triggered when a minor error is encountered. */
    warning: IPlayerError;
    /** Triggered when a new `Period` is currently playing. */
    periodChange: IPeriod;
    /**
     * Triggered when the ending position of the currently-playing content became
     * known or changed.
     */
    endingPositionChange: IEndingPositionInformation;
    /**
     * Triggered when the last possible chronological segment for all types of
     * buffers has either been pushed or is being pushed to the corresponding
     * MSE `SourceBuffer` or equivalent.
     * As such, the `endOfStream` MSE API might from now be able to be called.
     *
     * Note that it is possible to receive this event even if `endOfStream` has
     * already been called and even if an "endOfStream" event has already been
     * triggered.
     */
    endOfStream: null;
    /**
     * Triggered when the last possible chronological segment for all types of
     * buffers have NOT been pushed, or if it is not known whether is has been
     * pushed, and as such any potential pending `endOfStream` MSE API call
     * need to be cancelled.
     *
     * Note that it is possible to receive this event even if `endOfStream` has
     * not been called and even if an "resumeStream" event has already been
     * triggered.
     */
    resumeStream: null;
}
export type IContentTimeObserverPlaybackObservation = Pick<IStreamOrchestratorPlaybackObservation, "position">;
