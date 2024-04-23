import type { IReadOnlySharedReference } from "../utils/reference";
import type { CancellationSignal } from "../utils/task_canceller";
import type ObservationPosition from "./utils/observation_position";
/** "Event" that triggered the playback observation. */
export type IPlaybackObserverEventType = 
/** First playback observation automatically emitted. */
"init"
/** Observation manually forced by the PlaybackObserver. */
 | "manual"
/** Regularly emitted playback observation when no event happened in a long time. */
 | "timeupdate"
/** On the HTML5 event with the same name */
 | "canplay"
/** On the HTML5 event with the same name */
 | "ended"
/** On the HTML5 event with the same name */
 | "canplaythrough"
/** On the HTML5 event with the same name */
 | "play"
/** On the HTML5 event with the same name */
 | "pause"
/** On the HTML5 event with the same name */
 | "seeking"
/** On the HTML5 event with the same name */
 | "seeked"
/** On the HTML5 event with the same name */
 | "stalled"
/** On the HTML5 event with the same name */
 | "loadedmetadata"
/** On the HTML5 event with the same name */
 | "ratechange"
/** An internal seek happens */
 | "internal-seeking";
/** Information recuperated on the media element on each playback observation. */
export interface IMediaInfos {
    /** Value of `buffered` (buffered ranges) for the media element. */
    buffered: TimeRanges;
    /**
     * `currentTime` (position) set on the media element at the time of the
     * PlaybackObserver's measure.
     */
    position: number;
    /** Current `duration` set on the media element. */
    duration: number;
    /** Current `ended` set on the media element. */
    ended: boolean;
    /** Current `paused` set on the media element. */
    paused: boolean;
    /** Current `playbackRate` set on the media element. */
    playbackRate: number;
    /** Current `readyState` value on the media element. */
    readyState: number;
    /** Current `seeking` value on the mediaElement. */
    seeking: boolean;
}
/** Categorize a pending seek operation. */
export declare const enum SeekingState {
    /** We're not currently seeking. */
    None = 0,
    /**
     * We're currently seeking due to an internal logic of the RxPlayer (e.g.
     * discontinuity skipping).
     */
    Internal = 1,
    /** We're currently seeking due to a regular seek wanted by the application. */
    External = 2
}
/**
 * Describes when the player is "rebuffering" and what event started that
 * status.
 * "Rebuffering" is a status where the player has not enough buffer ahead to
 * play reliably.
 * The RxPlayer should pause playback when a playback observation indicates the
 * rebuffering status.
 */
export interface IRebufferingStatus {
    /** What started the player to rebuffer. */
    reason: "seeking" | "not-ready" | "buffering";
    /**
     * Monotonically-raising timestamp at the time the rebuffering happened on the
     * main thread.
     */
    timestamp: number;
    /**
     * Position, in seconds, at which data is awaited.
     * If `null` the player is rebuffering but not because it is awaiting future data.
     * If `undefined`, that position is unknown.
     */
    position: number | null | undefined;
}
/**
 * Describes when the player is "frozen".
 * This status is reserved for when the player is stuck at the same position for
 * an unknown reason.
 */
export interface IFreezingStatus {
    /**
     * Monotonically-raising timestamp at the time the freezing started to be
     * detected.
     */
    timestamp: number;
}
/** Information emitted on each playback observation. */
export interface IPlaybackObservation extends Omit<IMediaInfos, "position" | "seeking"> {
    /** Event that triggered this playback observation. */
    event: IPlaybackObserverEventType;
    /** Current seeking state. */
    seeking: SeekingState;
    /**
     * Information on the current position being played, the position for which
     * media is wanted etc.
     */
    position: ObservationPosition;
    /**
     * Set if the player is short on audio and/or video media data and is a such,
     * rebuffering.
     * `null` if not.
     */
    rebuffering: IRebufferingStatus | null;
    /**
     * Set if the player is frozen, that is, stuck in place for unknown reason.
     * Note that this reason can be a valid one, such as a necessary license not
     * being obtained yet.
     *
     * `null` if the player is not frozen.
     */
    freezing: IFreezingStatus | null;
    /**
     * Gap between `currentTime` and the next position with un-buffered data.
     * `Infinity` if we don't have buffered data right now.
     * `undefined` if we cannot determine the buffer gap.
     */
    bufferGap: number | undefined;
    /**
     * The buffered range we are currently playing.
     * `null` if no range is currently available.
     * `undefined` if we cannot tell which range is currently available.
     */
    currentRange: {
        start: number;
        end: number;
    } | null | undefined;
}
/**
 * Interface providing a generic and read-only version of a `PlaybackObserver`.
 *
 * This interface allows to provide regular and specific playback information
 * without allowing any effect on playback like seeking.
 *
 * This can be very useful to give specific playback information to modules you
 * don't want to be able to update playback.
 *
 * Note that a `PlaybackObserver` is compatible and can thus be upcasted to a
 * `IReadOnlyPlaybackObserver` to "remove" its right to update playback.
 */
export interface IReadOnlyPlaybackObserver<TObservationType> {
    /**
     * Get the current playing position, in seconds.
     * Returns `undefined` when this cannot be known, such as when the playback
     * observer is running in a WebWorker.
     * @returns {number|undefined}
     */
    getCurrentTime(): number | undefined;
    /**
     * Returns the current playback rate advertised by the `HTMLMediaElement`.
     * Returns `undefined` when this cannot be known, such as when the playback
     * observer is running in a WebWorker.
     * @returns {number|undefined}
     */
    getPlaybackRate(): number | undefined;
    /**
     * Get the HTMLMediaElement's current `readyState`.
     * Returns `undefined` when this cannot be known, such as when the playback
     * observer is running in a WebWorker.
     * @returns {number|undefined}
     */
    getReadyState(): number | undefined;
    /**
     * Returns the current `paused` status advertised by the `HTMLMediaElement`.
     *
     * Use this instead of the same status emitted on an observation when you want
     * to be sure you're using the current value.
     *
     * Returns `undefined` when this cannot be known, such as when the playback
     * observer is running in a WebWorker.
     * @returns {boolean|undefined}
     */
    getIsPaused(): boolean | undefined;
    /**
     * Returns an `IReadOnlySharedReference` storing the last playback observation
     * produced by the `IReadOnlyPlaybackObserver` and updated each time a new one
     * is produced.
     *
     * This value can then be for example listened to to be notified of future
     * playback observations.
     *
     * @returns {Object}
     */
    getReference(): IReadOnlySharedReference<TObservationType>;
    /**
     * Register a callback so it regularly receives playback observations.
     * @param {Function} cb
     * @param {Object} options - Configuration options:
     *   - `includeLastObservation`: If set to `true` the last observation will
     *     be first emitted synchronously.
     *   - `clearSignal`: If set, the callback will be unregistered when this
     *     CancellationSignal emits.
     * @returns {Function} - Allows to easily unregister the callback
     */
    listen(cb: (observation: TObservationType, stopListening: () => void) => void, options?: {
        includeLastObservation?: boolean | undefined;
        clearSignal?: CancellationSignal | undefined;
    }): void;
    /**
     * Generate a new `IReadOnlyPlaybackObserver` from this one.
     *
     * As argument, this method takes a function which will allow to produce
     * the new set of properties to be present on each observation.
     * @param {Function} transform
     * @returns {Object}
     */
    deriveReadOnlyObserver<TDest>(transform: (observationRef: IReadOnlySharedReference<TObservationType>, cancellationSignal: CancellationSignal) => IReadOnlySharedReference<TDest>): IReadOnlyPlaybackObserver<TDest>;
}
