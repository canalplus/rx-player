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
 * @class EWMA
 */
export default class EWMA {
    private readonly _alpha;
    /** Last average available. `0` if none is available yet. */
    private _lastEstimate;
    /** Sum of all "weights" given until now. */
    private _totalWeight;
    /**
     * @param {number} halfLife
     */
    constructor(halfLife: number);
    /**
     * @param {number} weight
     * @param {number} value
     */
    addSample(weight: number, value: number): void;
    /**
     * @returns {number} value
     */
    getEstimate(): number;
}
