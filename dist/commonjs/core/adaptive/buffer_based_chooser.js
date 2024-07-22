"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../log");
var array_find_index_1 = require("../../utils/array_find_index");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var monotonic_timestamp_1 = require("../../utils/monotonic_timestamp");
var get_buffer_levels_1 = require("./utils/get_buffer_levels");
/**
 * Minimum amount of time, in milliseconds, during which we are blocked from
 * raising in quality after it had been considered as too high.
 */
var MINIMUM_BLOCK_RAISE_DELAY = 6000;
/**
 * Maximum amount of time, in milliseconds, during which we are blocked from
 * raising in quality after it had been considered as too high.
 */
var MAXIMUM_BLOCK_RAISE_DELAY = 15000;
/**
 * Amount of time, in milliseconds, with which the blocking time in raising
 * the quality will be incremented if the current quality estimate is seen
 * as too unstable.
 */
var RAISE_BLOCKING_DELAY_INCREMENT = 3000;
/**
 * Amount of time, in milliseconds, with which the blocking time in raising
 * the quality will be dcremented if the current quality estimate is seen
 * as relatively stable, until `MINIMUM_BLOCK_RAISE_DELAY` is reached.
 */
var RAISE_BLOCKING_DELAY_DECREMENT = 1000;
/**
 * Amount of time, in milliseconds, after the "raise blocking delay" currently
 * in place (during which it is forbidden to raise up in quality), during which
 * we might want to raise the "raise blocking delay" if the last chosen quality
 * seems unsuitable.
 *
 * For example, let's consider that the current raise blocking delay is at
 * `4000`, or 4 seconds, and that this `STABILITY_CHECK_DELAY` is at `5000`, or
 * 5 seconds.
 * Here it means that if the estimated quality is found to be unsuitable less
 * than 4+5 = 9 seconds after it last was, we will increment the raise blocking
 * delay by `RAISE_BLOCKING_DELAY_INCREMENT` (unless `MAXIMUM_BLOCK_RAISE_DELAY`
 * is reached).
 * Else, if takes more than 9 seconds, the raise blocking delay might be
 * decremented.
 */
var STABILITY_CHECK_DELAY = 9000;
/**
 * Choose a bitrate based on the currently available buffer.
 *
 * This algorithm is based on a deviation of the BOLA algorithm.
 * It is a hybrid solution that also relies on a given bitrate's
 * "maintainability".
 * Each time a chunk is downloaded, from the ratio between the chunk duration
 * and chunk's request time, we can assume that the representation is
 * "maintanable" or not.
 * If so, we may switch to a better quality, or conversely to a worse quality.
 *
 * It also rely on mechanisms to avoid fluctuating too much between qualities.
 *
 * @class BufferBasedChooser
 */
var BufferBasedChooser = /** @class */ (function () {
    /**
     * @param {Array.<number>} bitrates
     */
    function BufferBasedChooser(bitrates) {
        this._levelsMap = (0, get_buffer_levels_1.default)(bitrates).map(function (bl) {
            return bl + 4; // Add some buffer security as it will be used conjointly with
            // other algorithms anyway
        });
        this._bitrates = bitrates;
        this._lastUnsuitableQualityTimestamp = undefined;
        this._blockRaiseDelay = MINIMUM_BLOCK_RAISE_DELAY;
        log_1.default.debug("ABR: Steps for buffer based chooser.", this._levelsMap
            .map(function (l, i) { return "bufferLevel: ".concat(l, ", bitrate: ").concat(bitrates[i]); })
            .join(" ,"));
    }
    /**
     * @param {Object} playbackObservation
     * @returns {number|undefined}
     */
    BufferBasedChooser.prototype.onAddedSegment = function (playbackObservation) {
        var bufferLevels = this._levelsMap;
        var bitrates = this._bitrates;
        var bufferGap = playbackObservation.bufferGap, currentBitrate = playbackObservation.currentBitrate, currentScore = playbackObservation.currentScore, speed = playbackObservation.speed;
        if ((0, is_null_or_undefined_1.default)(currentBitrate)) {
            this._currentEstimate = bitrates[0];
            return;
        }
        var currentBitrateIndex = -1;
        for (var i = 0; i < bitrates.length; i++) {
            // There could be bitrate duplicates. Only take the last one to simplify
            var bitrate = bitrates[i];
            if (bitrate === currentBitrate) {
                currentBitrateIndex = i;
            }
            else if (bitrate > currentBitrate) {
                break;
            }
        }
        if (currentBitrateIndex < 0 || bitrates.length !== bufferLevels.length) {
            log_1.default.info("ABR: Current Bitrate not found in the calculated levels");
            this._currentEstimate = bitrates[0];
            return;
        }
        var scaledScore;
        if (currentScore !== undefined) {
            scaledScore = speed === 0 ? currentScore.score : currentScore.score / speed;
        }
        var actualBufferGap = isFinite(bufferGap) ? bufferGap : 0;
        var now = (0, monotonic_timestamp_1.default)();
        if (actualBufferGap < bufferLevels[currentBitrateIndex] ||
            (scaledScore !== undefined &&
                scaledScore < 1 &&
                (currentScore === null || currentScore === void 0 ? void 0 : currentScore.confidenceLevel) === 1 /* ScoreConfidenceLevel.HIGH */)) {
            var timeSincePrev = this._lastUnsuitableQualityTimestamp === undefined
                ? -1
                : now - this._lastUnsuitableQualityTimestamp;
            if (timeSincePrev < this._blockRaiseDelay + STABILITY_CHECK_DELAY) {
                var newDelay = this._blockRaiseDelay + RAISE_BLOCKING_DELAY_INCREMENT;
                this._blockRaiseDelay = Math.min(newDelay, MAXIMUM_BLOCK_RAISE_DELAY);
                log_1.default.debug("ABR: Incrementing blocking raise in BufferBasedChooser due " +
                    "to unstable quality", this._blockRaiseDelay);
            }
            else {
                var newDelay = this._blockRaiseDelay - RAISE_BLOCKING_DELAY_DECREMENT;
                this._blockRaiseDelay = Math.max(MINIMUM_BLOCK_RAISE_DELAY, newDelay);
                log_1.default.debug("ABR: Lowering quality in BufferBasedChooser", this._blockRaiseDelay);
            }
            this._lastUnsuitableQualityTimestamp = now;
            // Security if multiple bitrates are equal, we now take the first one
            var baseIndex = (0, array_find_index_1.default)(bitrates, function (b) { return b === currentBitrate; });
            for (var i = baseIndex - 1; i >= 0; i--) {
                if (actualBufferGap >= bufferLevels[i]) {
                    this._currentEstimate = bitrates[i];
                    return;
                }
            }
            this._currentEstimate = bitrates[0];
            return;
        }
        if ((this._lastUnsuitableQualityTimestamp !== undefined &&
            now - this._lastUnsuitableQualityTimestamp < this._blockRaiseDelay) ||
            scaledScore === undefined ||
            scaledScore < 1.15 ||
            (currentScore === null || currentScore === void 0 ? void 0 : currentScore.confidenceLevel) !== 1 /* ScoreConfidenceLevel.HIGH */) {
            this._currentEstimate = currentBitrate;
            return;
        }
        var currentBufferLevel = bufferLevels[currentBitrateIndex];
        var nextIndex = (function () {
            for (var i = currentBitrateIndex + 1; i < bufferLevels.length; i++) {
                if (bufferLevels[i] > currentBufferLevel) {
                    return i;
                }
            }
        })();
        if (nextIndex !== undefined) {
            var nextBufferLevel = bufferLevels[nextIndex];
            if (bufferGap >= nextBufferLevel) {
                log_1.default.debug("ABR: Raising quality in BufferBasedChooser", bitrates[nextIndex]);
                this._currentEstimate = bitrates[nextIndex];
                return;
            }
        }
        this._currentEstimate = currentBitrate;
        return;
    };
    /**
     * Returns the last best Representation's bitrate estimate made by the
     * `BufferBasedChooser` or `undefined` if it has no such guess for now.
     *
     * Might be updated after `onAddedSegment` is called.
     *
     * @returns {number|undefined}
     */
    BufferBasedChooser.prototype.getLastEstimate = function () {
        return this._currentEstimate;
    };
    return BufferBasedChooser;
}());
exports.default = BufferBasedChooser;
