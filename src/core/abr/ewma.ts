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

/**
 * Tweaked implementation of an exponential weighted Moving Average.
 * Heavily "inspired" from the shaka-player one (Ewma).
 * @class EWMA
 */
export default class EWMA {
  private _alpha : number;
  private _lastEstimate : number;
  private _totalWeight : number;

  constructor(halfLife : number) {
    // (half-life = log(1/2) / log(Decay Factor)
    this._alpha = Math.exp(Math.log(0.5) / halfLife);
    this._lastEstimate = 0;
    this._totalWeight = 0;
  }

  public addSample(weight : number, value : number) : void {
    const adjAlpha = Math.pow(this._alpha, weight);
    const newEstimate = value * (1 - adjAlpha) + adjAlpha * this._lastEstimate;
    if (!isNaN(newEstimate)) {
      this._lastEstimate = newEstimate;
      this._totalWeight += weight;
    }
  }

  public getEstimate() : number {
    const zeroFactor = 1 - Math.pow(this._alpha, this._totalWeight);
    return this._lastEstimate / zeroFactor;
  }
}
