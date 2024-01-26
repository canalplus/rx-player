import type { IReadOnlySharedReference } from "../../../utils/reference";
import type { CancellationSignal } from "../../../utils/task_canceller";

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
  getCurrentTime() : number | undefined;
  /**
   * Returns the current playback rate advertised by the `HTMLMediaElement`.
   * Returns `undefined` when this cannot be known, such as when the playback
   * observer is running in a WebWorker.
   * @returns {number|undefined}
   */
  getPlaybackRate() : number | undefined;
  /**
   * Get the HTMLMediaElement's current `readyState`.
   * Returns `undefined` when this cannot be known, such as when the playback
   * observer is running in a WebWorker.
   * @returns {number|undefined}
   */
  getReadyState() : number | undefined;
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
  getIsPaused() : boolean | undefined;
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
  getReference() : IReadOnlySharedReference<TObservationType>;
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
  listen(
    cb : (
      observation : TObservationType,
      stopListening : () => void
    ) => void,
    options? : { includeLastObservation? : boolean | undefined;
                 clearSignal? : CancellationSignal | undefined; }
  ) : void;
  /**
   * Generate a new `IReadOnlyPlaybackObserver` from this one.
   *
   * As argument, this method takes a function which will allow to produce
   * the new set of properties to be present on each observation.
   * @param {Function} transform
   * @returns {Object}
   */
  deriveReadOnlyObserver<TDest>(
    transform : (
      observationRef : IReadOnlySharedReference<TObservationType>,
      cancellationSignal : CancellationSignal
    ) => IReadOnlySharedReference<TDest>
  ) : IReadOnlyPlaybackObserver<TDest>;
}

/**
 * Create `IReadOnlyPlaybackObserver` from a source `IReadOnlyPlaybackObserver`
 * and a mapping function.
 * @param {Object} src
 * @param {Function} transform
 * @returns {Object}
 */
export default function generateReadOnlyObserver<TSource, TDest>(
  src : IReadOnlyPlaybackObserver<TSource>,
  transform : (
    observationRef : IReadOnlySharedReference<TSource>,
    cancellationSignal : CancellationSignal
  ) => IReadOnlySharedReference<TDest>,
  cancellationSignal : CancellationSignal
) : IReadOnlyPlaybackObserver<TDest> {
  const mappedRef = transform(src.getReference(), cancellationSignal);
  return {
    getCurrentTime() {
      return src.getCurrentTime();
    },
    getReadyState() {
      return src.getReadyState();
    },
    getPlaybackRate() {
      return src.getPlaybackRate();
    },
    getIsPaused() {
      return src.getIsPaused();
    },
    getReference() : IReadOnlySharedReference<TDest> {
      return mappedRef;
    },
    listen(
      cb : (
        observation : TDest,
        stopListening : () => void
      ) => void,
      options? : { includeLastObservation? : boolean | undefined;
                   clearSignal? : CancellationSignal | undefined; }
    ) : void {
      if (cancellationSignal.isCancelled() ||
          options?.clearSignal?.isCancelled() === true)
      {
        return ;
      }
      mappedRef.onUpdate(cb, {
        clearSignal: options?.clearSignal,
        emitCurrentValue: options?.includeLastObservation,
      });
    },
    deriveReadOnlyObserver<TNext>(
      newTransformFn : (
        observationRef : IReadOnlySharedReference<TDest>,
        signal : CancellationSignal
      ) => IReadOnlySharedReference<TNext>
    ) : IReadOnlyPlaybackObserver<TNext> {
      return generateReadOnlyObserver(this, newTransformFn, cancellationSignal);
    },
  };
}
