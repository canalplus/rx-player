import type { IReadOnlySharedReference } from "../../utils/reference";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { IReadOnlyMediaElementMonitor } from "../types";

/**
 * Create `IReadOnlyMediaElementMonitor` from a source `IReadOnlyMediaElementMonitor`
 * and a mapping function.
 * @param {Object} src
 * @param {Function} transform
 * @returns {Object}
 */
export default function generateReadOnlyMonitor<TSource, TDest>(
  src: IReadOnlyMediaElementMonitor<TSource>,
  transform: (
    observationRef: IReadOnlySharedReference<TSource>,
    cancellationSignal: CancellationSignal,
  ) => IReadOnlySharedReference<TDest>,
  cancellationSignal: CancellationSignal,
): IReadOnlyMediaElementMonitor<TDest> {
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
      params: {
        includeLastObservation?: boolean | undefined;
        clearSignal: CancellationSignal;
      },
    ): void {
      if (cancellationSignal.isCancelled() || params.clearSignal.isCancelled()) {
        return;
      }
      mappedRef.onUpdate(cb, {
        clearSignal: params.clearSignal,
        emitCurrentValue: params.includeLastObservation,
      });
    },
    deriveReadOnlyMonitor<TNext>(
      newTransformFn: (
        observationRef: IReadOnlySharedReference<TDest>,
        signal: CancellationSignal,
      ) => IReadOnlySharedReference<TNext>,
    ): IReadOnlyMediaElementMonitor<TNext> {
      return generateReadOnlyMonitor(this, newTransformFn, cancellationSignal);
    },
  };
}
