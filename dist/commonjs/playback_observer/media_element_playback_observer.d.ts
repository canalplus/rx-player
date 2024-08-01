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
import type { IMediaElement } from "../compat/browser_compatibility_types";
import noop from "../utils/noop";
import type { IReadOnlySharedReference } from "../utils/reference";
import type { CancellationSignal } from "../utils/task_canceller";
import type { IPlaybackObservation, IReadOnlyPlaybackObserver } from "./types";
/**
 * Class allowing to "observe" current playback conditions so the RxPlayer is
 * then able to react upon them.
 *
 * This is a central class of the RxPlayer as many modules rely on the
 * `PlaybackObserver` to know the current state of the media being played.
 *
 * You can use the PlaybackObserver to either get the last observation
 * performed, get the current media state or listen to media observation sent
 * at a regular interval.
 *
 * @class {PlaybackObserver}
 */
export default class PlaybackObserver {
    /** HTMLMediaElement which we want to observe. */
    private _mediaElement;
    /** If `true`, a `MediaSource` object is linked to `_mediaElement`. */
    private _withMediaSource;
    /**
     * If `true`, we're playing in a low-latency mode, which might have an
     * influence on some chosen interval values here.
     */
    private _lowLatencyMode;
    /**
     * If set, position which could not yet be seeked to as the HTMLMediaElement
     * had a readyState of `0`.
     * This position should be seeked to as soon as the HTMLMediaElement is able
     * to handle it.
     */
    private _pendingSeek;
    /**
     * The RxPlayer usually wants to differientate when a seek was sourced from
     * the RxPlayer's internal logic vs when it was sourced from an outside
     * application code.
     *
     * To implement this in the PlaybackObserver, we maintain this counter
     * allowing to know when a "seeking" event received from a `HTMLMediaElement`
     * was due to an "internal seek" or an external seek:
     *   - This counter is incremented each time an "internal seek" (seek from the
     *     inside of the RxPlayer has been performed.
     *   - This counter is decremented each time we received a "seeking" event.
     *
     * This allows us to correctly characterize seeking events: if the counter is
     * superior to `0`, it is probably due to an internal "seek".
     */
    private _internalSeeksIncoming;
    /**
     * Stores the last playback observation produced by the `PlaybackObserver`.:
     */
    private _observationRef;
    /**
     * `TaskCanceller` allowing to free all resources and stop producing playback
     * observations.
     */
    private _canceller;
    /**
     * On some devices (right now only seen on Tizen), seeking through the
     * `currentTime` property can lead to the browser re-seeking once the
     * segments have been loaded to improve seeking performances (for
     * example, by seeking right to an intra video frame).
     * In that case, we risk being in a conflict with that behavior: if for
     * example we encounter a small discontinuity at the position the browser
     * seeks to, we will seek over it, the browser would seek back and so on.
     *
     * This variable allows to store the maximum known position we were seeking to
     * so we can detect when the browser seeked back (to avoid performing another
     * seek after that). When browsers seek back to a position behind a
     * discontinuity, they are usually able to skip them without our help.
     */
    private _expectedSeekingPosition;
    /**
     * Create a new `PlaybackObserver`, which allows to produce new "playback
     * observations" on various media events and intervals.
     *
     * Note that creating a `PlaybackObserver` lead to the usage of resources,
     * such as event listeners which will only be freed once the `stop` method is
     * called.
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} options
     */
    constructor(mediaElement: IMediaElement, options: IPlaybackObserverOptions);
    /**
     * Stop the `PlaybackObserver` from emitting playback observations and free all
     * resources reserved to emitting them such as event listeners and intervals.
     *
     * Once `stop` is called, no new playback observation will ever be emitted.
     *
     * Note that it is important to call stop once the `PlaybackObserver` is no
     * more needed to avoid unnecessarily leaking resources.
     */
    stop(): void;
    /**
     * Returns the current position advertised by the `HTMLMediaElement`, in
     * seconds.
     * @returns {number}
     */
    getCurrentTime(): number;
    /**
     * Returns the current playback rate advertised by the `HTMLMediaElement`.
     * @returns {number}
     */
    getPlaybackRate(): number;
    /**
     * Returns the current `paused` status advertised by the `HTMLMediaElement`.
     *
     * Use this instead of the same status emitted on an observation when you want
     * to be sure you're using the current value.
     * @returns {boolean}
     */
    getIsPaused(): boolean;
    /**
     * Update the current position (seek) on the `HTMLMediaElement`, by giving a
     * new position in seconds.
     *
     * Note that seeks performed through this method are caracherized as
     * "internal" seeks. They don't result into the exact same playback
     * observation than regular seeks (which most likely comes from the outside,
     * e.g. the user).
     * @param {number} time
     */
    setCurrentTime(time: number): void;
    /**
     * Update the playback rate of the `HTMLMediaElement`.
     * @param {number} playbackRate
     */
    setPlaybackRate(playbackRate: number): void;
    /**
     * Returns the current `readyState` advertised by the `HTMLMediaElement`.
     * @returns {number}
     */
    getReadyState(): number;
    /**
     * Returns an `IReadOnlySharedReference` storing the last playback observation
     * produced by the `PlaybackObserver` and updated each time a new one is
     * produced.
     *
     * This value can then be for example listened to to be notified of future
     * playback observations.
     *
     * @returns {Object}
     */
    getReference(): IReadOnlySharedReference<IPlaybackObservation>;
    /**
     * Register a callback so it regularly receives playback observations.
     * @param {Function} cb
     * @param {Object} options - Configuration options:
     *   - `includeLastObservation`: If set to `true` the last observation will
     *     be first emitted synchronously.
     *   - `clearSignal`: If set, the callback will be unregistered when this
     *     CancellationSignal emits.
     */
    listen(cb: (observation: IPlaybackObservation, stopListening: () => void) => void, options?: {
        includeLastObservation?: boolean | undefined;
        clearSignal?: CancellationSignal | undefined;
    }): typeof noop | undefined;
    /**
     * Generate a new playback observer which can listen to other
     * properties and which can only be accessed to read observations (e.g.
     * it cannot ask to perform a seek).
     *
     * The object returned will respect the `IReadOnlyPlaybackObserver` interface
     * and will inherit this `PlaybackObserver`'s lifecycle: it will emit when
     * the latter emits.
     *
     * As argument, this method takes a function which will allow to produce
     * the new set of properties to be present on each observation.
     * @param {Function} transform
     * @returns {Object}
     */
    deriveReadOnlyObserver<TDest>(transform: (observationRef: IReadOnlySharedReference<IPlaybackObservation>, cancellationSignal: CancellationSignal) => IReadOnlySharedReference<TDest>): IReadOnlyPlaybackObserver<TDest>;
    private _actuallySetCurrentTime;
    /**
     * Creates the `IReadOnlySharedReference` that will generate playback
     * observations.
     * @returns {Object}
     */
    private _createSharedReference;
    private _getCurrentObservation;
    private _generateObservationForEvent;
}
export interface IPlaybackObserverOptions {
    withMediaSource: boolean;
    lowLatencyMode: boolean;
}
//# sourceMappingURL=media_element_playback_observer.d.ts.map