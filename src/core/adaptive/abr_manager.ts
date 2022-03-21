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

import log from "../../log";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../manifest";
import createSharedReference, {
  IReadOnlySharedReference,
} from "../../utils/reference";
import takeFirstSet from "../../utils/take_first_set";
import { CancellationSignal } from "../../utils/task_canceller";
import { IReadOnlyPlaybackObserver } from "../api";
import { IBufferType } from "../segment_buffers";
import getEstimateReference, {
  IABREstimate,
  IRepresentationEstimatorCallbacks,
  IRepresentationEstimatorPlaybackObservation,
} from "./representation_estimator";
import BandwidthEstimator from "./utils/bandwidth_estimator";

/**
 * Select the most adapted Representation according to the network and buffer
 * metrics it receives.
 * @param {Object} options
 */
export default function createAdaptiveRepresentationSelector(
  options : IAdaptiveRepresentationSelectorArguments
) : IRepresentationEstimator {
  /**
   * Allows to estimate the current network bandwidth.
   * One per active media type.
   */
  const bandwidthEstimators : Partial<Record<IBufferType, BandwidthEstimator>> = {};
  const manualBitrates = options.manualBitrates;
  const minAutoBitrates = options.minAutoBitrates;
  const maxAutoBitrates = options.maxAutoBitrates;
  const initialBitrates = options.initialBitrates;
  const throttlers = options.throttlers;
  const lowLatencyMode = options.lowLatencyMode;

  /**
   * Take context and an array of the available representations, spit out an
   * observable emitting the best representation (given the network/buffer
   * state).
   * @param {Object} context
   * @param {Object} currentRepresentation - Reference emitting the
   * Representation currently loaded.
   * @param {Object} representations - Reference emitting the list of available
   * Representations to choose from.
   * @param {Object} playbackObserver - Emits regularly playback conditions
   * @param {Object} cancellationSignal - After this `CancellationSignal` emits,
   * estimates will stop to be emitted.
   * @returns {Array.<Object>}
   */
  return function getEstimates(
    context : { manifest : Manifest;
                period : Period;
                adaptation : Adaptation; },
    currentRepresentation : IReadOnlySharedReference<Representation | null>,
    representations : IReadOnlySharedReference<Representation[]>,
    playbackObserver : IReadOnlyPlaybackObserver<
      IRepresentationEstimatorPlaybackObservation
    >,
    cancellationSignal : CancellationSignal
  ) : [ IReadOnlySharedReference<IABREstimate>,
        IRepresentationEstimatorCallbacks ] {
    const { type } = context.adaptation;
    const bandwidthEstimator = _getBandwidthEstimator(type);
    const manualBitrate = takeFirstSet<IReadOnlySharedReference<number>>(
      manualBitrates[type],
      createSharedReference(-1));
    const minAutoBitrate = takeFirstSet<IReadOnlySharedReference<number>>(
      minAutoBitrates[type],
      createSharedReference(0));
    const maxAutoBitrate = takeFirstSet<IReadOnlySharedReference<number>>(
      maxAutoBitrates[type],
      createSharedReference(Infinity));
    const initialBitrate = takeFirstSet<number>(initialBitrates[type], 0);
    const filters = {
      limitWidth: takeFirstSet<IReadOnlySharedReference<number | undefined>>(
        throttlers.limitWidth[type],
        createSharedReference(undefined)),
      throttleBitrate: takeFirstSet<IReadOnlySharedReference<number>>(
        throttlers.throttleBitrate[type],
        throttlers.throttle[type],
        createSharedReference(Infinity)),
    };
    return getEstimateReference({ bandwidthEstimator,
                                  context,
                                  currentRepresentation,
                                  filters,
                                  initialBitrate,
                                  manualBitrate,
                                  minAutoBitrate,
                                  maxAutoBitrate,
                                  playbackObserver,
                                  representations,
                                  lowLatencyMode },
                                cancellationSignal);
  };

  /**
   * @param {string} bufferType
   * @returns {Object}
   */
  function _getBandwidthEstimator(bufferType : IBufferType) : BandwidthEstimator {
    const originalBandwidthEstimator = bandwidthEstimators[bufferType];
    if (originalBandwidthEstimator == null) {
      log.debug("ABR: Creating new BandwidthEstimator for ", bufferType);
      const bandwidthEstimator = new BandwidthEstimator();
      bandwidthEstimators[bufferType] = bandwidthEstimator;
      return bandwidthEstimator;
    }
    return originalBandwidthEstimator;
  }
}

/**
 * Type of the function returned by `createAdaptiveRepresentationSelector`,
 * allowing to estimate the most adapted `Representation`.
 */
export type IRepresentationEstimator = (
  context : { manifest : Manifest;
              period : Period;
              adaptation : Adaptation; },
  currentRepresentation : IReadOnlySharedReference<Representation | null>,
  representations : IReadOnlySharedReference<Representation[]>,
  playbackObserver : IReadOnlyPlaybackObserver<
    IRepresentationEstimatorPlaybackObservation
  >,
  cancellationSignal : CancellationSignal
) => [ IReadOnlySharedReference<IABREstimate>,
       IRepresentationEstimatorCallbacks ];

/** Arguments received by `createAdaptiveRepresentationSelector`. */
export interface IAdaptiveRepresentationSelectorArguments {
  /** Initial bitrate chosen, per type (minimum if not set) */
  initialBitrates: Partial<Record<IBufferType, number>>;

  /**
   * Some settings can depend on wether you're playing a low-latency content.
   * Set it to `true` if you're playing such content.
   */
  lowLatencyMode: boolean;

  /** Minimum bitrate chosen when in auto mode, per type (0 by default) */
  minAutoBitrates: Partial<Record<IBufferType, IReadOnlySharedReference<number>>>;

  /** Maximum bitrate chosen when in auto mode, per type (0 by default) */
  maxAutoBitrates: Partial<Record<IBufferType, IReadOnlySharedReference<number>>>;

  /** Manually forced bitrate set for a given type (`-1` for auto mode */
  manualBitrates: Partial<Record<IBufferType, IReadOnlySharedReference<number>>>;

  /** Allows to filter which Representations can be choosen. */
  throttlers: IRepresentationEstimatorThrottlers;
}

/**
 * Throttlers are interfaces allowing to limit the pool of Representations
 * to choose from.
 */
export interface IRepresentationEstimatorThrottlers {
  limitWidth : Partial<Record<IBufferType,
                              IReadOnlySharedReference<number>>>;
  throttle : Partial<Record<IBufferType,
                            IReadOnlySharedReference<number>>>;
  throttleBitrate : Partial<Record<IBufferType,
                                   IReadOnlySharedReference<number>>>;
}
