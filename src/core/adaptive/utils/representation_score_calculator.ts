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

import log from "../../../log";
import type { IRepresentation } from "../../../manifest";
import type { IRepresentationListItem } from "../adaptive_representation_selector";
import EWMA from "./ewma";

/**
 * Object representing a maintainability score as calculated by the
 * `RepresentationScoreCalculator`.
 */
export interface IRepresentationMaintainabilityScore {
  /**
   * Weighted mean of dividing the loaded segment's duration by the time to make
   * their request.
   */
  score: number;

  /**
   * The confidence we have on the calculated `score` in reflecting a useful
   * maintainability hint for the concerned Representation.
   *
   * Basically, the more segments have been loaded, the higher the confidence.
   */
  confidenceLevel: ScoreConfidenceLevel;
}

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
 * The score is mainly here to tell you when your buffer-based guesses are
 * actually higher than the quality you should normally reach.
 *
 * /!\ Please bear in mind that we don't consider the playback rate in those
 * operations.
 * Still, integrating the playback rate a posteriori should not be difficult
 * (e.g. you can just divide the score by that rate).
 *
 * @class RepresentationScoreCalculator
 */
export default class RepresentationScoreCalculator {
  private _currentRepresentationData: {
    representationItem: IRepresentationListItem;
    ewma: EWMA;
    loadedSegments: number;
    loadedDuration: number;
  } | null;

  private _lastRepresentationWithGoodScore: IRepresentationListItem | null;

  constructor() {
    this._currentRepresentationData = null;
    this._lastRepresentationWithGoodScore = null;
  }

  /**
   * Add new sample data.
   * @param {Object} representationItem
   * @param {number} requestDuration - duration taken for doing the request for
   * the whole segment.
   * @param {number} segmentDuration - media duration of the whole segment, in
   * seconds.
   */
  public addSample(
    representationItem: IRepresentationListItem,
    requestDuration: number,
    segmentDuration: number,
  ): void {
    const ratio = segmentDuration / requestDuration;
    const currentRep = this._currentRepresentationData;
    let currentEWMA: EWMA;
    if (
      currentRep !== null &&
      currentRep.representationItem.representation.id ===
        representationItem.representation.id
    ) {
      currentEWMA = currentRep.ewma;
      currentRep.ewma.addSample(requestDuration, ratio);
      currentRep.loadedDuration += segmentDuration;
      currentRep.loadedSegments++;
    } else {
      currentEWMA = new EWMA(5);
      currentEWMA.addSample(requestDuration, ratio);
      this._currentRepresentationData = {
        representationItem,
        ewma: currentEWMA,
        loadedDuration: segmentDuration,
        loadedSegments: 0,
      };
    }

    if (
      currentEWMA.getEstimate() > 1 &&
      this._lastRepresentationWithGoodScore?.representation.id !==
        representationItem.representation.id
    ) {
      log.debug(
        "ABR: New last stable representation",
        representationItem.representation.id,
      );
      this._lastRepresentationWithGoodScore = representationItem;
    }
  }

  /**
   * Get score estimate for the given Representation.
   * undefined if no estimate is available.
   * @param {Object} representation
   * @returns {number|undefined}
   */
  public getEstimate(
    representation: IRepresentation,
  ): IRepresentationMaintainabilityScore | undefined {
    if (
      this._currentRepresentationData === null ||
      this._currentRepresentationData.representationItem.representation.id !==
        representation.id
    ) {
      return undefined;
    }
    const { ewma, loadedSegments, loadedDuration } = this._currentRepresentationData;
    const estimate = ewma.getEstimate();
    const confidenceLevel =
      loadedSegments >= 5 && loadedDuration >= 10
        ? ScoreConfidenceLevel.HIGH
        : ScoreConfidenceLevel.LOW;

    return { score: estimate, confidenceLevel };
  }

  /**
   * Returns last Representation which had reached a score superior to 1.
   * This Representation is the last known one which could be maintained.
   * Useful to know if a current guess is higher than what you should
   * normally be able to play.
   * `null` if no Representation ever reach that score.
   * @returns {Object|null}
   */
  public getLastStableRepresentation(): IRepresentationListItem | null {
    return this._lastRepresentationWithGoodScore;
  }
}

/**
 * Value representing the level of confidence to have on a given score.
 * A low confidence level is most likely linked to too few samples to be relied
 * on without adapted considerations.
 */
export const enum ScoreConfidenceLevel {
  /** High confidence level: the score can be relied on. */
  HIGH = 1,
  /** Low confidence level: the score may still incorrectly reflect the truth. */
  LOW = 0,
}
