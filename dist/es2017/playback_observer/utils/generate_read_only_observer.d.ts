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
export default function generateReadOnlyObserver<TSource, TDest>(src: IReadOnlyPlaybackObserver<TSource>, transform: (observationRef: IReadOnlySharedReference<TSource>, cancellationSignal: CancellationSignal) => IReadOnlySharedReference<TDest>, cancellationSignal: CancellationSignal): IReadOnlyPlaybackObserver<TDest>;
