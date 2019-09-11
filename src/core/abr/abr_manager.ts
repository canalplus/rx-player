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
import { IBufferType } from "../source_buffers";
import BandwidthEstimator from "./bandwidth_estimator";
import createFilters from "./create_filters";
import RepresentationEstimator, {
  IABRBufferEvents,
  IABREstimate,
  IRepresentationEstimatorClockTick,
} from "./representation_estimator";

export type IABRManagerClockTick = IRepresentationEstimatorClockTick;

// Options for every RepresentationEstimator
interface IRepresentationEstimatorsThrottlers {
  limitWidth : Partial<Record<IBufferType, Observable<number>>>;
  throttle : Partial<Record<IBufferType, Observable<number>>>;
  throttleBitrate : Partial<Record<IBufferType, Observable<number>>>;
}

export interface IABRManagerArguments {
  manualBitrates: Partial<Record<IBufferType, Observable<number>>>;
  maxAutoBitrates: Partial<Record<IBufferType, Observable<number>>>;
  initialBitrates: Partial<Record<IBufferType, number>>;
  throttlers: IRepresentationEstimatorsThrottlers;
  lowBufferGap: boolean;
}

/**
 * Adaptive BitRate Manager.
 *
 * Select the right representation from the network and buffer infos it
 * receives.
 * @class ABRManager
 */
export default class ABRManager {
  private _manualBitrates : Partial<Record<IBufferType, Observable<number>>>;
  private _maxAutoBitrates : Partial<Record<IBufferType, Observable<number>>>;
  private _initialBitrates : Partial<Record<IBufferType, number>>;
  private _throttlers : IRepresentationEstimatorsThrottlers;
  private _bandwidthEstimators : Partial<Record<IBufferType, BandwidthEstimator>>;
  private _lowBufferGap : boolean;

  /**
   * @param {Object} options
   */
  constructor(options : IABRManagerArguments) {
    this._manualBitrates = options.manualBitrates || {};
    this._maxAutoBitrates = options.maxAutoBitrates || {};
    this._initialBitrates = options.initialBitrates || {};
    this._throttlers = options.throttlers || {};
    this._bandwidthEstimators = {};
    this._lowBufferGap = options.lowBufferGap;
  }

  /**
   * Take type and an array of the available representations, spit out an
   * observable emitting the best representation (given the network/buffer
   * state).
   * @param {string} type
   * @param {Array.<Representation>|undefined} representations
   * @param {Observable<Object>} clock$
   * @param {Observable<Object>} bufferEvents$
   * @returns {Observable}
   */
  public get$(
    type : IBufferType,
    representations : Representation[] = [],
    clock$ : Observable<IABRManagerClockTick>,
    bufferEvents$ : Observable<IABRBufferEvents>
  ) : Observable<IABREstimate> {
    const bandwidthEstimator = this._getBandwidthEstimator(type);
    const manualBitrate$ = this._manualBitrates[type] || observableOf(-1);
    const maxAutoBitrate$ = this._maxAutoBitrates[type] || observableOf(Infinity);
    const initialBitrate = this._initialBitrates[type] || 0;
    const filters$ = createFilters(this._throttlers.limitWidth[type],
                                   this._throttlers.throttleBitrate[type],
                                   this._throttlers.throttle[type]);
    return RepresentationEstimator({ bandwidthEstimator,
                                     bufferEvents$,
                                     clock$,
                                     filters$,
                                     initialBitrate,
                                     manualBitrate$,
                                     maxAutoBitrate$,
                                     representations,
                                     lowBufferGap: this._lowBufferGap });
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
