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

import { Representation } from "../../manifest";
import EWMA from "./ewma";

/**
 * Calculate the "maintainability score" of a given Representation:
 *   - A score higher than 1 means that the Representation can theorically
 *     be downloaded faster than the duration of the media it represents.
 *     (e.g. a segment representing 4 seconds can be downloaded in less than 4
 *     seconds).
 *   - A score lower or equal to 1 means that the Representation cannot be
 *     downloaded
 *
 * The score follows a simple linear relation to both variables it is based
 * on:
 *   - if n seconds of content can be downloaded in 2*n seconds, the score will
 *     be `0.5`.
 *   - if n seconds of content can be downloaded in n seconds, the score will be
 *     `1`.
 *   - if n seconds of content can be downloaded in n/2 seconds, the score will
 *     be `2`.
 *   - ...
 *
 * /!\ Please bear in mind that we don't consider the playback rate in those
 * operations.
 * Still, integrating the playback rate a posteriori should not be difficult
 * (e.g. you can just divide the score by that rate).
 *
 * @class RepresentationScoreCalculator
 */
export default class RepresentationScoreCalculator {
  private _currentRepresentationData : { representation : Representation;
                                         ewma : EWMA; } |
                                       null;

  private _lastRepresentationWithGoodScore : Representation | null;

  constructor() {
    this._currentRepresentationData = null;
    this._lastRepresentationWithGoodScore = null;
  }

  public addSample(
    representation : Representation,
    requestDuration : number,
    segmentDuration : number
  ) : void {
    const ratio = segmentDuration / requestDuration;
    const oldEwma = this._getEWMA(representation);
    let currentEWMA : EWMA;
    if (oldEwma != null) {
      currentEWMA = oldEwma;
      oldEwma.addSample(requestDuration, ratio);
    } else {
      currentEWMA = new EWMA(5);
      currentEWMA.addSample(requestDuration, ratio);
      this._currentRepresentationData = { representation, ewma: currentEWMA };
    }

    if (currentEWMA.getEstimate() > 1) {
      this._lastRepresentationWithGoodScore = representation;
    }
  }

  public getEstimate(representation : Representation) : number | undefined {
    const ewma = this._getEWMA(representation);
    if (ewma != null) {
      return ewma.getEstimate();
    }
  }

  public getLastStableRepresentation() : Representation | null {
    return this._lastRepresentationWithGoodScore;
  }

  private _getEWMA(representation : Representation) : EWMA | null {
    if (this._currentRepresentationData != null &&
        this._currentRepresentationData.representation.id === representation.id)
    {
      return this._currentRepresentationData.ewma;
    }
    return null;
  }
}
