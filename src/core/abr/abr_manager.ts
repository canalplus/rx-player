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
  ReplaySubject,
} from "rxjs";
import log from "../../log";
import { Representation } from "../../manifest";
import { IBufferType } from "../source_buffers";
import BandwidthEstimator from "./bandwidth_estimator";
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

export interface IABRManagerOptions {
  manualBitrates: Partial<Record<IBufferType, number>>;
  maxAutoBitrates: Partial<Record<IBufferType, number>>;
  initialBitrates: Partial<Record<IBufferType, number>>;
  throttlers: IRepresentationEstimatorsThrottlers;
}

interface IABRManagerCommonElementsPerType {
  bandwidthEstimator : BandwidthEstimator;
  maxAutoBitrate$ : ReplaySubject<number>;
  manualBitrate$ : ReplaySubject<number>;
}

/**
 * Adaptive BitRate Manager.
 *
 * Select the right representation from the network and buffer infos it
 * receives.
 * @class ABRManager
 */
export default class ABRManager {
  private _manualBitrates : Partial<Record<IBufferType, number>>;
  private _maxAutoBitrates : Partial<Record<IBufferType, number>>;
  private _initialBitrates : Partial<Record<IBufferType, number>>;
  private _throttlers : IRepresentationEstimatorsThrottlers;
  private _commonElementsPerType : Partial<Record<IBufferType,
                                           IABRManagerCommonElementsPerType>>;

  constructor(options : IABRManagerOptions) {
    this._manualBitrates = options.manualBitrates || {};
    this._maxAutoBitrates = options.maxAutoBitrates || {};
    this._initialBitrates = options.initialBitrates || {};
    this._throttlers = options.throttlers || {};
    this._commonElementsPerType = {};
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
    const { bandwidthEstimator,
            manualBitrate$,
            maxAutoBitrate$ } = this._getCommonElementsForType(type);
    const initialBitrate = this._initialBitrates[type];
    const throttlers = { limitWidth$: this._throttlers.limitWidth[type],
                         throttleBitrate$: this._throttlers.throttleBitrate[type],
                         throttle$: this._throttlers.throttle[type] };
    return RepresentationEstimator({ bandwidthEstimator,
                                     bufferEvents$,
                                     clock$,
                                     initialBitrate,
                                     manualBitrate$,
                                     maxAutoBitrate$,
                                     representations,
                                     throttlers });
  }

  /**
   * Set manually the bitrate for a given type.
   *
   * The given number will act as a ceil.
   * If no representation is found with the given bitrate, we will consider:
   *   1. The representation just lower than it
   *   2. If no representation is found in the previous step, the representation
   *   with the lowest bitrate.
   *
   * @param {string} type
   * @param {number} bitrate
   */
  public setManualBitrate(type : IBufferType, bitrate : number) : void {
    log.info("ABR: Setting manual bitrate", type, bitrate);
    if (bitrate === this._manualBitrates[type]) {
      return;
    }

    this._manualBitrates[type] = bitrate;
    const typeElements = this._commonElementsPerType[type];
    if (typeElements != null) {
      typeElements.manualBitrate$.next(bitrate);
    }
  }

  /**
   * Set a maximum bitrate a given type will be able to automatically switch to.
   * The estimator for the given type can still emit higher bitrates with the
   * setManualBitrate method.
   * @param {string} supportedBufferTypes
   * @param {number} bitrate
   */
  public setMaxAutoBitrate(type : IBufferType, bitrate : number) : void {
    log.info("ABR: Setting maximum auto bitrate", type, bitrate);
    if (bitrate === this._maxAutoBitrates[type]) {
      return;
    }

    this._maxAutoBitrates[type] = bitrate;
    const typeElements = this._commonElementsPerType[type];
    if (typeElements != null) {
      typeElements.maxAutoBitrate$.next(bitrate);
    }
  }

  /**
   * Returns the set (and active) manual bitrate for the given type.
   * @param {string} supportedBufferTypes
   * @returns {number|undefined}
   */
  public getManualBitrate(type : IBufferType) : number|undefined {
    return this._manualBitrates[type];
  }

  /**
   * Returns the set (and active) maximum auto bitrate for the given type.
   * @param {string} supportedBufferTypes
   * @returns {number|undefined}
   */
  public getMaxAutoBitrate(type : IBufferType) : number|undefined {
    return this._maxAutoBitrates[type];
  }

  /**
   * Clean ressources linked to the ABRManager.
   * The ABRManager is unusable after calling this method.
   */
  public dispose() : void {
    log.debug("ABR: Freeing up ressources");
    Object.keys(this._commonElementsPerType).forEach((type) => {
      const infos = this._commonElementsPerType[type as IBufferType];
      if (infos != null) {
        infos.bandwidthEstimator.reset();
        infos.maxAutoBitrate$.complete();
        infos.manualBitrate$.complete();
      }
    });
  }

  /**
   * @param {string} bufferType
   * @returns {Object}
   */
  private _getCommonElementsForType(
    bufferType : IBufferType
  ) : IABRManagerCommonElementsPerType {
    const originalInfos = this._commonElementsPerType[bufferType];
    if (originalInfos == null) {
      log.debug("ABR: Creating new BandwidthEstimator for ", bufferType);
      const bandwidthEstimator = new BandwidthEstimator();

      const manualBitrate$ = new ReplaySubject<number>(1);
      const manualBitrate = this._manualBitrates[bufferType];
      manualBitrate$.next(manualBitrate == null ? -1 : manualBitrate);

      const maxAutoBitrate$ = new ReplaySubject<number>(1);
      const maxAutoBitrate = this._maxAutoBitrates[bufferType];
      maxAutoBitrate$.next(maxAutoBitrate == null ? -1 : maxAutoBitrate);

      const infos = { bandwidthEstimator, maxAutoBitrate$, manualBitrate$ };
      this._commonElementsPerType[bufferType] = infos;
      return infos;
    }
    return originalInfos;
  }
}
