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
import type { IPlaybackObservation, IReadOnlyPlaybackObserver } from "../../playback_observer";
import type { IPlayerState } from "../../public_types";
import type { IReadOnlySharedReference } from "../../utils/reference";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { ContentInitializer, IStallingSituation } from "../init";
/**
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} playbackObserver - Observes playback conditions on
 * `mediaElement`.
 * @param {function} onSeeking - Callback called when a seeking operation starts
 * on `mediaElement`.
 * @param {function} onSeeked - Callback called when a seeking operation ends
 * on `mediaElement`.
 * @param {Object} cancelSignal - When triggered, stop calling callbacks and
 * remove all listeners this function has registered.
 */
export declare function emitSeekEvents(mediaElement: HTMLMediaElement | null, playbackObserver: IReadOnlyPlaybackObserver<IPlaybackObservation>, onSeeking: () => void, onSeeked: () => void, cancelSignal: CancellationSignal): void;
/**
 * @param {HTMLMediaElement} mediaElement
 * @param {function} onPlay - Callback called when a play operation has started
 * on `mediaElement`.
 * @param {function} onPause - Callback called when a pause operation has
 * started on `mediaElement`.
 * @param {Object} cancelSignal - When triggered, stop calling callbacks and
 * remove all listeners this function has registered.
 */
export declare function emitPlayPauseEvents(mediaElement: HTMLMediaElement | null, onPlay: () => void, onPause: () => void, cancelSignal: CancellationSignal): void;
/** Player state dictionnary. */
export declare const enum PLAYER_STATES {
    STOPPED = "STOPPED",
    LOADED = "LOADED",
    LOADING = "LOADING",
    PLAYING = "PLAYING",
    PAUSED = "PAUSED",
    ENDED = "ENDED",
    BUFFERING = "BUFFERING",
    SEEKING = "SEEKING",
    FREEZING = "FREEZING",
    RELOADING = "RELOADING"
}
export declare function constructPlayerStateReference(initializer: ContentInitializer, mediaElement: HTMLMediaElement, playbackObserver: IReadOnlyPlaybackObserver<IPlaybackObservation>, cancelSignal: CancellationSignal): IReadOnlySharedReference<IPlayerState>;
/**
 * Get state string for a _loaded_ content.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} stalledStatus - Current stalled state:
 *   - null when not stalled
 *   - a description of the situation if stalled.
 * @returns {string}
 */
export declare function getLoadedContentState(mediaElement: HTMLMediaElement, stalledStatus: IStallingSituation | null): IPlayerState;
export declare function isLoadedState(state: IPlayerState): boolean;
