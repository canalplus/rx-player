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
import type { IRepresentation } from "../../manifest";
import type LastEstimateStorage from "./utils/last_estimate_storage";
import type { IRequestInfo } from "./utils/pending_requests_store";
import type RepresentationScoreCalculator from "./utils/representation_score_calculator";
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
    private _lastAbrEstimate;
    private _scoreCalculator;
    private _consecutiveWrongGuesses;
    private _blockGuessesUntil;
    private _lastMaintanableBitrate;
    /**
     * Create a new `GuessBasedChooser`.
     * @param {Object} scoreCalculator
     * @param {Object} prevEstimate
     */
    constructor(scoreCalculator: RepresentationScoreCalculator, prevEstimate: LastEstimateStorage);
    /**
     * Perform a "guess", which basically indicates which Representation should be
     * chosen according to the `GuessBasedChooser`.
     *
     * @param {Array.<Object>} representations - Array of all Representation the
     * GuessBasedChooser can choose from, sorted by bitrate ascending.
     * /!\ It is very important that Representation in that Array are sorted by
     * bitrate ascending for this method to work as intented.
     * @param {Object} observation - Last playback observation performed.
     * @param {Object} currentRepresentation - The Representation currently
     * loading.
     * @param {number} incomingBestBitrate - The bitrate of the Representation
     * chosen by the more optimistic of the other ABR algorithms currently.
     * @param {Array.<Object>} requests - Information on all pending requests.
     * @returns {Object|null} - If a guess is made, return that guess, else
     * returns `null` (in which case you should fallback to another ABR
     * algorithm).
     */
    getGuess(representations: IRepresentation[], observation: {
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
    }, currentRepresentation: IRepresentation, incomingBestBitrate: number, requests: IRequestInfo[]): IRepresentation | null;
    /**
     * Returns `true` if we've enough confidence on the current situation to make
     * a higher guess.
     * @param {number} bufferGap
     * @param {number} speed
     * @param {Array} scoreData
     * @returns {boolean}
     */
    private _canGuessHigher;
    /**
     * Returns `true` if the pending guess of `lastGuess` seems to not
     * be maintainable and as such should be stopped.
     * @param {Object} lastGuess
     * @param {Array} scoreData
     * @param {number} bufferGap
     * @param {Array.<Object>} requests
     * @returns {boolean}
     */
    private _shouldStopGuess;
    private _isLastGuessValidated;
}
//# sourceMappingURL=guess_based_chooser.d.ts.map