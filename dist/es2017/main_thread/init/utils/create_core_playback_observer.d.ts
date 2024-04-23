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
import type { IPausedPlaybackObservation } from "../../../core/types";
import type { IManifestMetadata } from "../../../manifest";
import type { IMediaSourceInterface } from "../../../mse";
import type { IPlaybackObservation, IReadOnlyPlaybackObserver, IMediaElementPlaybackObserver, ObservationPosition, IRebufferingStatus, IFreezingStatus } from "../../../playback_observer";
import type { ITrackType } from "../../../public_types";
import type { IRange } from "../../../utils/ranges";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import type { CancellationSignal } from "../../../utils/task_canceller";
import type { ITextDisplayer } from "../../text_displayer";
/** Arguments needed to create the core's version of the PlaybackObserver. */
export interface ICorePlaybackObserverArguments {
    /** If true, the player will auto-play when `initialPlayPerformed` becomes `true`. */
    autoPlay: boolean;
    /** Manifest of the content being played */
    manifest: IManifestMetadata;
    /** Becomes `true` after the initial play has been taken care of. */
    initialPlayPerformed: IReadOnlySharedReference<boolean>;
    /** The last speed requested by the user. */
    speed: IReadOnlySharedReference<number>;
    /**
     * Used abstraction to implement text track displaying.
     *
     * `null` if text tracks are disabled
     */
    textDisplayer: ITextDisplayer | null;
    /** Used abstraction for MSE API. */
    mediaSource: IMediaSourceInterface | null;
}
export interface ICorePlaybackObservation {
    /**
     * Information on whether the media element was paused at the time of the
     * Observation.
     */
    paused: IPausedPlaybackObservation;
    /**
     * Information on the current media position in seconds at the time of the
     * Observation.
     */
    position: ObservationPosition;
    /** `duration` property of the HTMLMediaElement. */
    duration: number;
    /** `readyState` property of the HTMLMediaElement. */
    readyState: number;
    /** Target playback rate at which we want to play the content. */
    speed: number;
    /** Theoretical maximum position on the content that can currently be played. */
    maximumPosition: number;
    /**
     * Ranges of buffered data per type of media.
     * `null` if no buffer exists for that type of media.
     */
    buffered: Record<ITrackType, IRange[] | null>;
    rebuffering: IRebufferingStatus | null;
    freezing: IFreezingStatus | null;
    bufferGap: number | undefined;
}
/**
 * Create PlaybackObserver for the core part of the code.
 * @param {Object} srcPlaybackObserver - Base `PlaybackObserver` from which we
 * will derive information.
 * @param {Object} context - Various information linked to the current content
 * being played.
 * @param {Object} fnCancelSignal - Abort the created PlaybackObserver.
 * @returns {Object}
 */
export default function createCorePlaybackObserver(srcPlaybackObserver: IMediaElementPlaybackObserver, { autoPlay, initialPlayPerformed, manifest, mediaSource, speed, textDisplayer, }: ICorePlaybackObserverArguments, fnCancelSignal: CancellationSignal): IReadOnlyPlaybackObserver<ICorePlaybackObservation>;
export declare function updateWantedPositionIfAfterManifest(observation: IPlaybackObservation, manifest: IManifestMetadata): void;
export declare function getPendingPaused(initialPlayPerformed: IReadOnlySharedReference<boolean>, autoPlay: boolean): boolean | undefined;
