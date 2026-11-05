import type CorePlaybackObserver from "../../../src/playback_observer/core_playback_observer.ts";
import type MediaElementPlaybackObserver from "../../../src/playback_observer/media_element_playback_observer.ts";
import type { IReadOnlyPlaybackObserver } from "../../../src/playback_observer/types.ts";
import type ObservationPosition from "../../../src/playback_observer/utils/observation_position.ts";
import SharedReference from "../../../src/utils/reference.ts";
import type { CancellationSignal } from "../../../src/utils/task_canceller.ts";
import { makeMockedClass } from "./utils.ts";

/**
 * Construct a class implementing the `MediaElementPlaybackObserver` interface.
 * @class DummyMediaElementPlaybackObserver
 */
export const DummyMediaElementPlaybackObserver =
  makeMockedClass<MediaElementPlaybackObserver>(
    {
      attachMediaElement: notImplemented("attachMediaElement"),
      getCurrentTime: notImplemented("getCurrentTime"),
      getIsPaused: notImplemented("getIsPaused"),
      getPendingSeekInformation: notImplemented("getPendingSeekInformation"),
      getPlaybackRate: notImplemented("getPlaybackRate"),
      getReadyState: notImplemented("getReadyState"),
      getReference: notImplemented("getReference"),
      stop: notImplemented("stop"),
      blockSeeking: notImplemented("blockSeeking"),
      unblockSeeking: notImplemented("unblockSeeking"),
      isSeekingBlocked: notImplemented("isSeekingBlocked"),
      setCurrentTime: notImplemented("setCurrentTime"),
      setPlaybackRate: notImplemented("setPlaybackRate"),
      listen: notImplemented("listen"),
      deriveReadOnlyObserver: notImplemented("deriveReadOnlyObserver"),
      onMediaElementAttachment: notImplemented("onMediaElementAttachment"),
    },
    {},
  );

/**
 * Construct a class implementing the `CorePlaybackObserver` interface.
 * @class DummyCorePlaybackObserver
 */
export const DummyCorePlaybackObserver = makeMockedClass<CorePlaybackObserver>(
  {
    getCurrentTime: notImplemented("getCurrentTime"),
    getIsPaused: notImplemented("getIsPaused"),
    getPlaybackRate: notImplemented("getPlaybackRate"),
    getReadyState: notImplemented("getReadyState"),
    getReference: notImplemented("getReference"),
    setPlaybackRate: notImplemented("setPlaybackRate"),
    listen: notImplemented("listen"),
    deriveReadOnlyObserver: notImplemented("deriveReadOnlyObserver"),
  },
  {},
);

/**
 * Object facilitation the usage of a IReadOnlyPlaybackObserver`.
 * /!\ Do not forget to call `reset` when done to ensure no memory leak.
 */
export interface IMockedReadOnlyPlaybackObserver<TObservationData> {
  /**
   * The `IReadOnlyPlaybackObserver` itself.
   */
  observer: IReadOnlyPlaybackObserver<TObservationData>;
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
 * Allows to create any `IReadOnlyPlaybackObserver` with TypeScript typechecking
 * and to obtain a function to emit new observations.
 * @param {Object} initialData - The initial observation emitted.
 * @returns {Object} res
 * @returns {IReadOnlyPlaybackObserver} res.observer - The
 * `IReadOnlyPlaybackObserver` instance.
 * @returns {Function} res.emit - A function allowing to emit new observations.
 * @returns {Function} res.reset - Reset the playback observer to its initial
 * state, also removing all its listeners. Call this between tests.
 */
export function makeReadyOnlyPlaybackObserver<TObservationData>(
  initialData: TObservationData,
): IMockedReadOnlyPlaybackObserver<TObservationData> {
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

  function makeObserver(): IReadOnlyPlaybackObserver<TObservationData> {
    const klass = makeMockedClass<IReadOnlyPlaybackObserver<TObservationData>>(
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
        deriveReadOnlyObserver: notImplemented("deriveReadOnlyObserver"),
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
