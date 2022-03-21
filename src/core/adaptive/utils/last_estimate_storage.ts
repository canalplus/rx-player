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

import { Representation } from "../../../manifest";

/** Stores the last estimate made by the `RepresentationEstimator`. */
export default class LastEstimateStorage {
  /**
   * Estimated bandwitdh in the last estimate.
   * `undefined` either if no estimate has been performed yet or if the
   * bandwidth was unknown during the last estimate.
   */
  public bandwidth : number | undefined;
  /**
   * Estimated Representation in the last estimate.
   * `null` if no estimate has been performed yet.
   */
  public representation : Representation | null;

  /** Algorithm type used to make the last Representation estimate. */
  public algorithmType : ABRAlgorithmType;

  constructor() {
    this.bandwidth = undefined;
    this.representation = null;
    this.algorithmType = ABRAlgorithmType.None;
  }

  /**
   * Update this `LastEstimateStorage` with new values.
   * @param {Object} representation - Estimated Representation.
   * @param {number|undefined} bandwidth - Estimated bandwidth.
   * @param {boolean} wasGuessed - If `true`, this estimate was a guess made by
   * the `GuessingEstimator`.
   */
  public update(
    representation : Representation,
    bandwidth : number | undefined,
    algorithmType : ABRAlgorithmType
  ) : void {
    this.representation = representation;
    this.bandwidth = bandwidth;
    this.algorithmType = algorithmType;
  }
}

/** Identify an algorithm used to perform a Representation estimate.  */
export const enum ABRAlgorithmType {
 /**
  * Buffer-based algorithm using mostly the size of the buffer to determine the
  * best Representation.
  */
  BufferBased,
  /**
   * Bandwidth-based algorithm using mostly the speed at which segments are
   * downloaded to determine the best Representation.
   */
  BandwidthBased,
  /**
   * Guess-based algorithm, which iterates through Representation and
   * try to find the best one empirically.
   */
  GuessBased,
    /** None of the other or no algorithm was used yet. */
  None,
}
