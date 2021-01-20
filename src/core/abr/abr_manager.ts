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

import {
  Observable,
  of as observableOf,
} from "rxjs";
import log from "../../log";
import { Representation } from "../../manifest";
import takeFirstSet from "../../utils/take_first_set";
import { IBufferType } from "../segment_buffers";
import BandwidthEstimator from "./bandwidth_estimator";
import createFilters from "./create_filters";
import RepresentationEstimator, {
  IABREstimate,
  IABRStreamEvents,
  IRepresentationEstimatorClockTick,
} from "./representation_estimator";

export type IABRManagerClockTick = IRepresentationEstimatorClockTick;

// Options for every RepresentationEstimator
interface IRepresentationEstimatorsThrottlers {
  limitWidth : Partial<Record<IBufferType,
                              Observable<number>>>;
  throttle : Partial<Record<IBufferType,
                            Observable<number>>>;
  throttleBitrate : Partial<Record<IBufferType,
                                   Observable<number>>>;
}

export interface IABRManagerArguments {
  initialBitrates: Partial<Record<IBufferType, // Initial bitrate chosen, per
                                  number>>;    // type (minimum if not set)
  lowLatencyMode: boolean; // Some settings can depend on wether you're playing a
                           // low-latency content. Set it to `true` if you're playing
                           // such content.
  minAutoBitrates: Partial<Record<IBufferType,          // Minimum bitrate chosen
                                  Observable<number>>>; // when in auto mode, per
                                                        // type (0 by default)
  maxAutoBitrates: Partial<Record<IBufferType,          // Maximum bitrate chosen
                                  Observable<number>>>; // when in auto mode, per
                                                        // type (Infinity by default)
  manualBitrates: Partial<Record<IBufferType,          // Manual bitrate set for
                                 Observable<number>>>; // a given type (-1 for
                                                       // auto mode)
  throttlers: IRepresentationEstimatorsThrottlers; // Throttle from external events
}

/**
 * Adaptive BitRate Manager.
 *
 * Select the right Representation from the network and buffer infos it
 * receives.
 * @class ABRManager
 */
export default class ABRManager {
  private _bandwidthEstimators : Partial<Record<IBufferType, BandwidthEstimator>>;
  private _initialBitrates : Partial<Record<IBufferType, number>>;
  private _manualBitrates : Partial<Record<IBufferType, Observable<number>>>;
  private _minAutoBitrates : Partial<Record<IBufferType, Observable<number>>>;
  private _maxAutoBitrates : Partial<Record<IBufferType, Observable<number>>>;
  private _throttlers : IRepresentationEstimatorsThrottlers;
  private _lowLatencyMode : boolean;

  /**
   * @param {Object} options
   */
  constructor(options : IABRManagerArguments) {
    this._manualBitrates = options.manualBitrates;
    this._minAutoBitrates = options.minAutoBitrates;
    this._maxAutoBitrates = options.maxAutoBitrates;
    this._initialBitrates = options.initialBitrates;
    this._throttlers = options.throttlers;
    this._bandwidthEstimators = {};
    this._lowLatencyMode = options.lowLatencyMode;
  }

  /**
   * Take type and an array of the available representations, spit out an
   * observable emitting the best representation (given the network/buffer
   * state).
   * @param {string} type
   * @param {Array.<Representation>} representations
   * @param {Observable<Object>} clock$
   * @param {Observable<Object>} streamEvents$
   * @returns {Observable}
   */
  public get$(
    type : IBufferType,
    representations : Representation[],
    clock$ : Observable<IABRManagerClockTick>,
    streamEvents$ : Observable<IABRStreamEvents>
  ) : Observable<IABREstimate> {
    const bandwidthEstimator = this._getBandwidthEstimator(type);
    const manualBitrate$ =
      takeFirstSet<Observable<number>>(this._manualBitrates[type], observableOf(-1));
    const minAutoBitrate$ =
      takeFirstSet<Observable<number>>(this._minAutoBitrates[type],
                                       observableOf(0));
    const maxAutoBitrate$ =
      takeFirstSet<Observable<number>>(this._maxAutoBitrates[type],
                                       observableOf(Infinity));
    const initialBitrate = takeFirstSet<number>(this._initialBitrates[type], 0);
    const filters$ = createFilters(this._throttlers.limitWidth[type],
                                   this._throttlers.throttleBitrate[type],
                                   this._throttlers.throttle[type]);
    return RepresentationEstimator({ bandwidthEstimator,
                                     streamEvents$,
                                     clock$,
                                     filters$,
                                     initialBitrate,
                                     manualBitrate$,
                                     minAutoBitrate$,
                                     maxAutoBitrate$,
                                     representations,
                                     lowLatencyMode: this._lowLatencyMode });
  }

  /**
   * @param {string} bufferType
   * @returns {Object}
   */
  private _getBandwidthEstimator(bufferType : IBufferType) : BandwidthEstimator {
    const originalBandwidthEstimator = this._bandwidthEstimators[bufferType];
    if (originalBandwidthEstimator == null) {
      log.debug("ABR: Creating new BandwidthEstimator for ", bufferType);
      const bandwidthEstimator = new BandwidthEstimator();
      this._bandwidthEstimators[bufferType] = bandwidthEstimator;
      return bandwidthEstimator;
    }
    return originalBandwidthEstimator;
  }
}
