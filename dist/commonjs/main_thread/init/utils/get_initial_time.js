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
var config_1 = require("../../../config");
var log_1 = require("../../../log");
var manifest_1 = require("../../../manifest");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
/**
 * Returns the calculated initial time for the content described by the given
 * Manifest:
 *   1. if a start time is defined by user, calculate starting time from the
 *      manifest information
 *   2. else if the media is live, use the live edge and suggested delays from
 *      it
 *   3. else returns the minimum time announced in the manifest
 * @param {Manifest} manifest
 * @param {boolean} lowLatencyMode
 * @param {Object} startAt
 * @returns {Number}
 */
function getInitialTime(manifest, lowLatencyMode, startAt) {
    var _a;
    if (!(0, is_null_or_undefined_1.default)(startAt)) {
        var min = (0, manifest_1.getMinimumSafePosition)(manifest);
        var max = (0, manifest_1.getMaximumSafePosition)(manifest);
        if (!(0, is_null_or_undefined_1.default)(startAt.position)) {
            log_1.default.debug("Init: using startAt.minimumPosition");
            return Math.max(Math.min(startAt.position, max), min);
        }
        else if (!(0, is_null_or_undefined_1.default)(startAt.wallClockTime)) {
            log_1.default.debug("Init: using startAt.wallClockTime");
            var ast = manifest.availabilityStartTime === undefined ? 0 : manifest.availabilityStartTime;
            var position = startAt.wallClockTime - ast;
            return Math.max(Math.min(position, max), min);
        }
        else if (!(0, is_null_or_undefined_1.default)(startAt.fromFirstPosition)) {
            log_1.default.debug("Init: using startAt.fromFirstPosition");
            var fromFirstPosition = startAt.fromFirstPosition;
            return fromFirstPosition <= 0 ? min : Math.min(max, min + fromFirstPosition);
        }
        else if (!(0, is_null_or_undefined_1.default)(startAt.fromLastPosition)) {
            log_1.default.debug("Init: using startAt.fromLastPosition");
            var fromLastPosition = startAt.fromLastPosition;
            return fromLastPosition >= 0 ? max : Math.max(min, max + fromLastPosition);
        }
        else if (!(0, is_null_or_undefined_1.default)(startAt.fromLivePosition)) {
            log_1.default.debug("Init: using startAt.fromLivePosition");
            var livePosition = (_a = (0, manifest_1.getLivePosition)(manifest)) !== null && _a !== void 0 ? _a : max;
            var fromLivePosition = startAt.fromLivePosition;
            return fromLivePosition >= 0
                ? livePosition
                : Math.max(min, livePosition + fromLivePosition);
        }
        else if (!(0, is_null_or_undefined_1.default)(startAt.percentage)) {
            log_1.default.debug("Init: using startAt.percentage");
            var percentage = startAt.percentage;
            if (percentage > 100) {
                return max;
            }
            else if (percentage < 0) {
                return min;
            }
            var ratio = +percentage / 100;
            var extent = max - min;
            return min + extent * ratio;
        }
    }
    var minimumPosition = (0, manifest_1.getMinimumSafePosition)(manifest);
    if (manifest.isLive) {
        var suggestedPresentationDelay = manifest.suggestedPresentationDelay, clockOffset = manifest.clockOffset;
        var maximumPosition = (0, manifest_1.getMaximumSafePosition)(manifest);
        var liveTime = void 0;
        var DEFAULT_LIVE_GAP = config_1.default.getCurrent().DEFAULT_LIVE_GAP;
        if (clockOffset === undefined) {
            log_1.default.info("Init: no clock offset found for a live content, " +
                "starting close to maximum available position");
            liveTime = maximumPosition;
        }
        else {
            log_1.default.info("Init: clock offset found for a live content, " +
                "checking if we can start close to it");
            var ast = manifest.availabilityStartTime === undefined ? 0 : manifest.availabilityStartTime;
            var clockRelativeLiveTime = ((0, monotonic_timestamp_1.default)() + clockOffset) / 1000 - ast;
            liveTime = Math.min(maximumPosition, clockRelativeLiveTime);
        }
        var diffFromLiveTime = suggestedPresentationDelay !== null && suggestedPresentationDelay !== void 0 ? suggestedPresentationDelay : (lowLatencyMode ? DEFAULT_LIVE_GAP.LOW_LATENCY : DEFAULT_LIVE_GAP.DEFAULT);
        log_1.default.debug("Init: ".concat(liveTime, " defined as the live time, applying a live gap") +
            " of ".concat(diffFromLiveTime));
        return Math.max(liveTime - diffFromLiveTime, minimumPosition);
    }
    log_1.default.info("Init: starting at the minimum available position:", minimumPosition);
    return minimumPosition;
}
exports.default = getInitialTime;
