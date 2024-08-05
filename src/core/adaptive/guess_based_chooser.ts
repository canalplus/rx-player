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
import arrayFindIndex from "../../utils/array_find_index";
import getMonotonicTimeStamp from "../../utils/monotonic_timestamp";
import type { IRepresentationListItem } from "./adaptive_representation_selector";
import { estimateRequestBandwidth } from "./network_analyzer";
import type LastEstimateStorage from "./utils/last_estimate_storage";
import { ABRAlgorithmType } from "./utils/last_estimate_storage";
import type { IRequestInfo } from "./utils/pending_requests_store";
import type { IRepresentationMaintainabilityScore } from "./utils/representation_score_calculator";
import type RepresentationScoreCalculator from "./utils/representation_score_calculator";
import { ScoreConfidenceLevel } from "./utils/representation_score_calculator";

/**
 * Estimate which Representation should be played based on risky "guesses".
 *
 * Basically, this `GuessBasedChooser` will attempt switching to the superior
 * quality when conditions allows this and then check if we're able to maintain
 * this quality. If we're not, it will rollbacks to the previous, maintaninable,
 * guess.
 *
 * The algorithm behind the `GuessBasedChooser` is very risky in terms of
 * rebuffering chances. As such, it should only be used when other approach
 * don't work (e.g.  low-latency contents).
 * @class GuessBasedChooser
 */
export default class GuessBasedChooser {
  private _lastAbrEstimate: LastEstimateStorage;
  private _scoreCalculator: RepresentationScoreCalculator;
  private _consecutiveWrongGuesses: number;
  private _blockGuessesUntil: number;
  private _lastMaintanableBitrate: number | null;

  /**
   * Create a new `GuessBasedChooser`.
   * @param {Object} scoreCalculator
   * @param {Object} prevEstimate
   */
  constructor(
    scoreCalculator: RepresentationScoreCalculator,
    prevEstimate: LastEstimateStorage,
  ) {
    this._scoreCalculator = scoreCalculator;
    this._lastAbrEstimate = prevEstimate;
    this._consecutiveWrongGuesses = 0;
    this._blockGuessesUntil = 0;
    this._lastMaintanableBitrate = null;
  }

  /**
   * Perform a "guess", which basically indicates which Representation should be
   * chosen according to the `GuessBasedChooser`.
   *
   * @param {Array.<Object>} representationList - Array of all Representation the
   * GuessBasedChooser can choose from, sorted by bitrate ascending.
   * /!\ It is very important that Representation in that Array are sorted by
   * bitrate ascending for this method to work as intented.
   * @param {Object} observation - Last playback observation performed.
   * @param {Object} currentRepresentationItem - The Representation currently
   * loading.
   * @param {number} incomingBestBitrate - The bitrate of the Representation
   * chosen by the more optimistic of the other ABR algorithms currently.
   * @param {Array.<Object>} requests - Information on all pending requests.
   * @returns {Object|null} - If a guess is made, return that guess, else
   * returns `null` (in which case you should fallback to another ABR
   * algorithm).
   */
  public getGuess(
    representationList: IRepresentationListItem[],
    observation: {
      /**
       * For the concerned media buffer, difference in seconds between the next
       * position where no segment data is available and the current position.
       */
      bufferGap: number;
      /**
       * Last "playback rate" set by the user. This is the ideal "playback rate" at
       * which the media should play.
       */
      speed: number;
    },
    currentRepresentationItem: IRepresentationListItem,
    incomingBestBitrate: number,
    requests: IRequestInfo[],
  ): IRepresentationListItem | null {
    const { bufferGap, speed } = observation;
    const lastChosenRep = this._lastAbrEstimate.representationItem;
    if (lastChosenRep === null) {
      return null; // There's nothing to base our guess on
    }

    if (incomingBestBitrate > lastChosenRep.bandwidth) {
      // ABR estimates are already superior or equal to the guess
      // we'll be doing here, so no need to guess
      if (this._lastAbrEstimate.algorithmType === ABRAlgorithmType.GuessBased) {
        if (this._lastAbrEstimate.representationItem !== null) {
          this._lastMaintanableBitrate =
            this._lastAbrEstimate.representationItem.bandwidth;
        }
        this._consecutiveWrongGuesses = 0;
      }
      return null;
    }

    const scoreData = this._scoreCalculator.getEstimate(
      currentRepresentationItem.representation,
    );
    if (this._lastAbrEstimate.algorithmType !== ABRAlgorithmType.GuessBased) {
      if (scoreData === undefined) {
        return null; // not enough information to start guessing
      }
      if (this._canGuessHigher(bufferGap, speed, scoreData)) {
        const nextRepresentation = getNextRepresentation(
          representationList,
          currentRepresentationItem,
        );
        if (nextRepresentation !== null) {
          return nextRepresentation;
        }
      }
      return null;
    }

    // If we reached here, we're currently already in guessing mode

    if (this._isLastGuessValidated(lastChosenRep, incomingBestBitrate, scoreData)) {
      log.debug("ABR: Guessed Representation validated", lastChosenRep.bandwidth);
      this._lastMaintanableBitrate = lastChosenRep.bandwidth;
      this._consecutiveWrongGuesses = 0;
    }

    if (currentRepresentationItem.representation.id !== lastChosenRep.representation.id) {
      return lastChosenRep;
    }

    const shouldStopGuess = this._shouldStopGuess(
      currentRepresentationItem,
      scoreData,
      bufferGap,
      requests,
    );
    if (shouldStopGuess) {
      // Block guesses for a time
      this._consecutiveWrongGuesses++;
      this._blockGuessesUntil =
        getMonotonicTimeStamp() + Math.min(this._consecutiveWrongGuesses * 15000, 120000);
      return (
        getPreviousRepresentation(representationList, currentRepresentationItem) ?? null
      );
    } else if (scoreData === undefined) {
      return currentRepresentationItem;
    }

    if (this._canGuessHigher(bufferGap, speed, scoreData)) {
      const nextRepresentation = getNextRepresentation(
        representationList,
        currentRepresentationItem,
      );
      if (nextRepresentation !== null) {
        return nextRepresentation;
      }
    }
    return currentRepresentationItem;
  }

  /**
   * Returns `true` if we've enough confidence on the current situation to make
   * a higher guess.
   * @param {number} bufferGap
   * @param {number} speed
   * @param {Array} scoreData
   * @returns {boolean}
   */
  private _canGuessHigher(
    bufferGap: number,
    speed: number,
    { score, confidenceLevel }: IRepresentationMaintainabilityScore,
  ): boolean {
    return (
      isFinite(bufferGap) &&
      bufferGap >= 2.5 &&
      getMonotonicTimeStamp() > this._blockGuessesUntil &&
      confidenceLevel === ScoreConfidenceLevel.HIGH &&
      score / speed > 1.01
    );
  }

  /**
   * Returns `true` if the pending guess of `lastGuess` seems to not
   * be maintainable and as such should be stopped.
   * @param {Object} lastGuess
   * @param {Array} scoreData
   * @param {number} bufferGap
   * @param {Array.<Object>} requests
   * @returns {boolean}
   */
  private _shouldStopGuess(
    lastGuess: IRepresentationListItem,
    scoreData: IRepresentationMaintainabilityScore | undefined,
    bufferGap: number,
    requests: IRequestInfo[],
  ): boolean {
    if (scoreData !== undefined && scoreData.score < 1.01) {
      return true;
    } else if ((scoreData === undefined || scoreData.score < 1.2) && bufferGap < 0.6) {
      return true;
    }

    const guessedRepresentationRequests = requests.filter((req) => {
      return req.content.representation.id === lastGuess.representation.id;
    });

    const now = getMonotonicTimeStamp();
    for (const req of guessedRepresentationRequests) {
      const requestElapsedTime = now - req.requestTimestamp;
      if (req.content.segment.isInit) {
        if (requestElapsedTime > 1000) {
          return true;
        }
      } else if (requestElapsedTime > req.content.segment.duration * 1000 + 200) {
        return true;
      } else {
        const fastBw = estimateRequestBandwidth(req);
        if (fastBw !== undefined && fastBw < lastGuess.bandwidth * 0.8) {
          return true;
        }
      }
    }
    return false;
  }

  private _isLastGuessValidated(
    lastGuess: IRepresentationListItem,
    incomingBestBitrate: number,
    scoreData: IRepresentationMaintainabilityScore | undefined,
  ): boolean {
    if (
      scoreData !== undefined &&
      scoreData.confidenceLevel === ScoreConfidenceLevel.HIGH &&
      scoreData.score > 1.5
    ) {
      return true;
    }
    return (
      incomingBestBitrate >= lastGuess.bandwidth &&
      (this._lastMaintanableBitrate === null ||
        this._lastMaintanableBitrate < lastGuess.bandwidth)
    );
  }
}

/**
 * From the array of Representations given, returns the Representation with a
 * bitrate immediately superior to the current one.
 * Returns `null` if that "next" Representation is not found.
 *
 * /!\ The representations have to be already sorted by bitrate, in ascending
 * order.
 * @param {Array.<Object>} representationList - Available representations to choose
 * from, sorted by bitrate in ascending order.
 * @param {Object} currentRepresentationItem - The Representation currently
 * considered.
 * @returns {Object|null}
 */
function getNextRepresentation(
  representationList: IRepresentationListItem[],
  currentRepresentationItem: IRepresentationListItem,
): IRepresentationListItem | null {
  const len = representationList.length;
  let index = arrayFindIndex(
    representationList,
    ({ representation }) =>
      representation.id === currentRepresentationItem.representation.id,
  );
  if (index < 0) {
    log.error("ABR: Current Representation not found.");
    return null;
  }

  while (++index < len) {
    if (representationList[index].bandwidth > currentRepresentationItem.bandwidth) {
      return representationList[index];
    }
  }
  return null;
}

/**
 * From the array of Representations given, returns the Representation with a
 * bitrate immediately inferior.
 * Returns `null` if that "previous" Representation is not found.
 * @param {Array.<Object>} representations
 * @param {Object} currentRepresentationItem
 * @returns {Object|null}
 */
function getPreviousRepresentation(
  representations: IRepresentationListItem[],
  currentRepresentationItem: IRepresentationListItem,
): IRepresentationListItem | null {
  let index = arrayFindIndex(
    representations,
    ({ representation }) =>
      representation.id === currentRepresentationItem.representation.id,
  );
  if (index < 0) {
    log.error("ABR: Current Representation not found.");
    return null;
  }

  while (--index >= 0) {
    if (representations[index].bandwidth < currentRepresentationItem.bandwidth) {
      return representations[index];
    }
  }
  return null;
}
