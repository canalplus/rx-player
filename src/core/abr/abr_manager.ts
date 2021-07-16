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
  combineLatest as observableCombineLatest,
  map,
  Observable,
  of as observableOf,
} from "rxjs";
import log from "../../log";
import { Representation } from "../../manifest";
import objectAssign from "../../utils/object_assign";
import { ISharedReference } from "../../utils/reference";
import takeFirstSet from "../../utils/take_first_set";
import { IBufferType } from "../segment_buffers";
import BandwidthEstimator from "./bandwidth_estimator";
import RepresentationEstimator, {
  IABREstimate,
  IABRFiltersObject,
  IABRStreamEvents,
  IRepresentationEstimatorPlaybackObservation,
} from "./representation_estimator";

export type IABRManagerPlaybackObservation = IRepresentationEstimatorPlaybackObservation;

// Options for every RepresentationEstimator
interface IRepresentationEstimatorsThrottlers {
  limitWidth : Partial<Record<IBufferType,
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

  /** Minimum bitrate chosen when in auto mode, per type (0 by default) */
  minAutoBitrates: Partial<Record<IBufferType, ISharedReference<number>>>;

  /** Maximum bitrate chosen when in auto mode, per type (0 by default) */
  maxAutoBitrates: Partial<Record<IBufferType, ISharedReference<number>>>;

  /** Manually forced bitrate set for a given type (`-1` for auto mode */
  manualBitrates: Partial<Record<IBufferType, ISharedReference<number>>>;

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
  private _manualBitrates : Partial<Record<IBufferType, ISharedReference<number>>>;
  private _minAutoBitrates : Partial<Record<IBufferType, ISharedReference<number>>>;
  private _maxAutoBitrates : Partial<Record<IBufferType, ISharedReference<number>>>;
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
   * @param {Observable<Object>} observation$
   * @param {Observable<Object>} streamEvents$
   * @returns {Observable}
   */
  public get$(
    type : IBufferType,
    representations : Representation[],
    observation$ : Observable<IABRManagerPlaybackObservation>,
    streamEvents$ : Observable<IABRStreamEvents>
  ) : Observable<IABREstimate> {
    const bandwidthEstimator = this._getBandwidthEstimator(type);
    const manualBitrate$ =
      takeFirstSet<Observable<number>>(this._manualBitrates[type]?.asObservable(),
                                       observableOf(-1));
    const minAutoBitrate$ =
      takeFirstSet<Observable<number>>(this._minAutoBitrates[type]?.asObservable(),
                                       observableOf(0));
    const maxAutoBitrate$ =
      takeFirstSet<Observable<number>>(this._maxAutoBitrates[type]?.asObservable(),
                                       observableOf(Infinity));
    const initialBitrate = takeFirstSet<number>(this._initialBitrates[type], 0);
    const filters$ = createFilters(this._throttlers.limitWidth[type],
                                   this._throttlers.throttleBitrate[type]);
    return RepresentationEstimator({ bandwidthEstimator,
                                     streamEvents$,
                                     observation$,
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

/**
 * Create Observable that merge several throttling Observables into one.
 * @param {Observable} limitWidth$ - Emit the width at which the chosen
 * Representation should be limited.
 * @param {Observable} throttleBitrate$ - Emit the maximum bitrate authorized.
 * @returns {Observable}
 */
function createFilters(
  limitWidth$? : Observable<number>,
  throttleBitrate$? : Observable<number>
) : Observable<IABRFiltersObject> {
  const deviceEventsArray : Array<Observable<IABRFiltersObject>> = [];

  if (limitWidth$ != null) {
    deviceEventsArray.push(limitWidth$.pipe(map(width => ({ width }))));
  }
  if (throttleBitrate$ != null) {
    deviceEventsArray.push(throttleBitrate$.pipe(map(bitrate => ({ bitrate }))));
  }

  // Emit restrictions on the pools of available representations to choose
  // from.
  return deviceEventsArray.length > 0 ?
    observableCombineLatest(deviceEventsArray)
      .pipe(map((args : IABRFiltersObject[]) =>
        objectAssign({}, ...args) as IABRFiltersObject)) :
    observableOf({});
}
