import type CoreMediaElementMonitor from "../../../src/media_element_monitor/core_media_element_monitor.ts";
import type MediaElementMonitor from "../../../src/media_element_monitor/media_element_monitor.ts";
import type { IReadOnlyMediaElementMonitor } from "../../../src/media_element_monitor/types.ts";
import type ObservationPosition from "../../../src/media_element_monitor/utils/observation_position.ts";
import SharedReference from "../../../src/utils/reference.ts";
import type { CancellationSignal } from "../../../src/utils/task_canceller.ts";
import { makeMockedClass } from "./utils.ts";

/**
 * Construct a class implementing the `MediaElementMonitor` interface.
 * @class DummyMediaElementMonitor
 */
export const DummyMediaElementMonitor =
  makeMockedClass<MediaElementMonitor>(
    {
      attachMediaElement: notImplemented("attachMediaElement"),
      getCurrentTime: notImplemented("getCurrentTime"),
      getIsPaused: notImplemented("getIsPaused"),
      getPendingSeekInformation: notImplemented("getPendingSeekInformation"),
      getPlaybackRate: notImplemented("getPlaybackRate"),
      getReadyState: notImplemented("getReadyState"),
      getReference: notImplemented("getReference"),
      getMediaElement: notImplemented("getMediaElement"),
      addMediaErrorListener: notImplemented("addMediaErrorListener"),
      linkUrl: notImplemented("linkUrl"),
      destroy: notImplemented("destroy"),
      blockSeeking: notImplemented("blockSeeking"),
      unblockSeeking: notImplemented("unblockSeeking"),
      isSeekingBlocked: notImplemented("isSeekingBlocked"),
      setCurrentTime: notImplemented("setCurrentTime"),
      setPlaybackRate: notImplemented("setPlaybackRate"),
      listen: notImplemented("listen"),
      deriveReadOnlyMonitor: notImplemented("deriveReadOnlyMonitor"),
    },
    {},
  );

/**
 * Construct a class implementing the `CoreMediaElementMonitor` interface.
 * @class DummyCoreMediaElementMonitor
 */
export const DummyCoreMediaElementMonitor = makeMockedClass<CoreMediaElementMonitor>(
  {
    getCurrentTime: notImplemented("getCurrentTime"),
    getIsPaused: notImplemented("getIsPaused"),
    getPlaybackRate: notImplemented("getPlaybackRate"),
    getReadyState: notImplemented("getReadyState"),
    getReference: notImplemented("getReference"),
    setPlaybackRate: notImplemented("setPlaybackRate"),
    listen: notImplemented("listen"),
    deriveReadOnlyMonitor: notImplemented("deriveReadOnlyMonitor"),
  },
  {},
);

/**
 * Object facilitation the usage of a IReadOnlyMediaElementMonitor`.
 * /!\ Do not forget to call `reset` when done to ensure no memory leak.
 */
export interface IMockedReadOnlyMediaElementMonitor<TObservationData> {
  /**
   * The `IReadOnlyMediaElementMonitor` itself.
   */
  observer: IReadOnlyMediaElementMonitor<TObservationData>;
  /**
   * Allows to trigger new observations through `observer`.
   */
  emit: (data: TObservationData) => void;
  /**
   * Reset `observer` to its initial observation, also removing all observation
   * listener it potentially had.
   *
   * Intended to be called between each test to clean-up.
   */
  reset: () => void;
}

/**
 * Allows to create any `IReadOnlyMediaElementMonitor` with TypeScript typechecking
 * and to obtain a function to emit new observations.
 * @param {Object} initialData - The initial observation emitted.
 * @returns {Object} res
 * @returns {IReadOnlyMediaElementMonitor} res.observer - The
 * `IReadOnlyMediaElementMonitor` instance.
 * @returns {Function} res.emit - A function allowing to emit new observations.
 * @returns {Function} res.reset - Reset the media element monitor to its initial
 * state, also removing all its listeners. Call this between tests.
 */
export function makeReadyOnlyMediaElementMonitor<TObservationData>(
  initialData: TObservationData,
): IMockedReadOnlyMediaElementMonitor<TObservationData> {
  let ref = new SharedReference<TObservationData>(initialData);
  const ret = {
    observer: makeObserver(),
    emit: (data: TObservationData) => {
      ref.setValue(data);
    },
    reset: () => {
      ref.finish();
      ref = new SharedReference<TObservationData>(initialData);
    },
  };
  return ret;

  function makeObserver(): IReadOnlyMediaElementMonitor<TObservationData> {
    const klass = makeMockedClass<IReadOnlyMediaElementMonitor<TObservationData>>(
      {
        getCurrentTime: notImplemented("getCurrentTime"),
        getIsPaused: notImplemented("getIsPaused"),
        getPlaybackRate: notImplemented("getPlaybackRate"),
        getReadyState: notImplemented("getReadyState"),
        getReference: () => ref,
        listen(
          cb: (observation: TObservationData, stopListening: () => void) => void,
          params: {
            includeLastObservation?: boolean | undefined;
            clearSignal: CancellationSignal;
          },
        ) {
          if (params.clearSignal.isCancelled()) {
            return;
          }
          ref.onUpdate(cb, {
            clearSignal: params.clearSignal,
            emitCurrentValue: params.includeLastObservation,
          });
        },
        deriveReadOnlyMonitor: notImplemented("deriveReadOnlyMonitor"),
      },
      {},
    );
    return new klass();
  }
}

/**
 * Construct a class implementing the `ObservationPosition` interface.
 * @class DummyObservationPosition
 */
export const DummyObservationPosition = makeMockedClass<ObservationPosition>(
  {
    serialize: notImplemented("serialize"),
    getPolled: notImplemented("getPolled"),
    getWanted: notImplemented("getWanted"),
    forceWantedPosition: notImplemented("forceWantedPosition"),
    isAwaitingFuturePosition: notImplemented("isAwaitingFuturePosition"),
  },
  {},
);

function notImplemented(name: string): () => never {
  return () => {
    throw new Error(`${name} not implemented`);
  };
}
