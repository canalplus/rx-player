import type { IReadOnlySharedReference } from "../../utils/reference";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { IReadOnlyPlaybackObserver } from "../types";

/**
 * Create `IReadOnlyPlaybackObserver` from a source `IReadOnlyPlaybackObserver`
 * and a mapping function.
 * @param {Object} src
 * @param {Function} transform
 * @returns {Object}
 */
export default function generateReadOnlyObserver<TSource, TDest>(
  src: IReadOnlyPlaybackObserver<TSource>,
  transform: (
    observationRef: IReadOnlySharedReference<TSource>,
    cancellationSignal: CancellationSignal,
  ) => IReadOnlySharedReference<TDest>,
  cancellationSignal: CancellationSignal,
): IReadOnlyPlaybackObserver<TDest> {
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
    getReference(): IReadOnlySharedReference<TDest> {
      return mappedRef;
    },
    listen(
      cb: (observation: TDest, stopListening: () => void) => void,
      options?: {
        includeLastObservation?: boolean | undefined;
        clearSignal?: CancellationSignal | undefined;
      },
    ): void {
      if (
        cancellationSignal.isCancelled() ||
        options?.clearSignal?.isCancelled() === true
      ) {
        return;
      }
      mappedRef.onUpdate(cb, {
        clearSignal: options?.clearSignal,
        emitCurrentValue: options?.includeLastObservation,
      });
    },
    deriveReadOnlyObserver<TNext>(
      newTransformFn: (
        observationRef: IReadOnlySharedReference<TDest>,
        signal: CancellationSignal,
      ) => IReadOnlySharedReference<TNext>,
    ): IReadOnlyPlaybackObserver<TNext> {
      return generateReadOnlyObserver(this, newTransformFn, cancellationSignal);
    },
  };
}
