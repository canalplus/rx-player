import SharedReference from "../../../utils/reference.ts";
import type {
  IABREstimate,
  IAdaptiveRepresentationSelectorArguments,
  IRepresentationEstimator,
} from "../adaptive_representation_selector.ts";

/**
 * Easily create objects matching the arguments of the `AdaptiveRepresentationSelector`.
 */
export function makeAdaptiveRepresensationSelectorArgs(
  opts: Partial<IAdaptiveRepresentationSelectorArguments> = {},
): IAdaptiveRepresentationSelectorArguments {
  return {
    initialBitrates: {},
    lowLatencyMode: false,
    throttlers: {
      limitResolution: {},
      throttleBitrate: {},
    },
    ...opts,
  };
}

/** Easily create objects matching the `IABREstimate` structure. */
export function makeAbrEstimate(opts: Partial<IABREstimate> = {}): IABREstimate {
  return {
    bitrate: undefined,
    representation: null,
    urgent: false,
    knownStableBitrate: undefined,
    ...opts,
  };
}

/**
 * Object facilitation the usage of a `IRepresentationEstimator`.
 * /!\ Do not forget to call `reset` when done to ensure no memory leak.
 */
export interface IMockedRepresentationEstimator {
  /** The `IRepresentationEstimator` itself. */
  estimator: IRepresentationEstimator;
  /**
   * Allows to trigger new estimate through **every** objects returned by
   * `estimator`.
   */
  emit: (obj: IABREstimate) => void;
  /**
   * Reset `estimator` to its initial state, also removing all estimate
   * listeners it potentially had.
   * Intended to be called between each test to clean-up.
   */
  reset: () => void;
}

/**
 * Allows to create a `IRepresentationEstimator` with TypeScript typechecking
 * and to obtain a function allowing to emit estimates.
 * @returns {Object} res
 */
export function makeMockedRepresentationEstimator(): {
  estimator: IRepresentationEstimator;
  emit: (obj: IABREstimate) => void;
  reset: () => void;
} {
  let ref = new SharedReference<IABREstimate>(makeAbrEstimate());
  const estimator: IRepresentationEstimator = () => {
    return {
      estimates: ref,
      callbacks: {
        // TODO: find out how to exploit those after writing some tests
        addedSegment() {
          throw new Error("Not implemented");
        },
        metrics() {
          throw new Error("Not implemented");
        },
        requestBegin() {
          throw new Error("Not implemented");
        },
        requestEnd() {
          throw new Error("Not implemented");
        },
        requestProgress() {
          throw new Error("Not implemented");
        },
      },
    };
  };
  return {
    estimator,
    emit(obj: IABREstimate) {
      ref.setValue(obj);
    },
    reset() {
      ref.finish();
      ref = new SharedReference<IABREstimate>(makeAbrEstimate());
    },
  };
}
