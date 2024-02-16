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
import config from "../../../config";
import log from "../../../log";
import { getLivePosition, getMaximumSafePosition, getMinimumSafePosition, } from "../../../manifest";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";
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
export default function getInitialTime(manifest, lowLatencyMode, startAt) {
    var _a;
    if (!isNullOrUndefined(startAt)) {
        const min = getMinimumSafePosition(manifest);
        const max = getMaximumSafePosition(manifest);
        if (!isNullOrUndefined(startAt.position)) {
            log.debug("Init: using startAt.minimumPosition");
            return Math.max(Math.min(startAt.position, max), min);
        }
        else if (!isNullOrUndefined(startAt.wallClockTime)) {
            log.debug("Init: using startAt.wallClockTime");
            const ast = manifest.availabilityStartTime === undefined ? 0 : manifest.availabilityStartTime;
            const position = startAt.wallClockTime - ast;
            return Math.max(Math.min(position, max), min);
        }
        else if (!isNullOrUndefined(startAt.fromFirstPosition)) {
            log.debug("Init: using startAt.fromFirstPosition");
            const { fromFirstPosition } = startAt;
            return fromFirstPosition <= 0 ? min : Math.min(max, min + fromFirstPosition);
        }
        else if (!isNullOrUndefined(startAt.fromLastPosition)) {
            log.debug("Init: using startAt.fromLastPosition");
            const { fromLastPosition } = startAt;
            return fromLastPosition >= 0 ? max : Math.max(min, max + fromLastPosition);
        }
        else if (!isNullOrUndefined(startAt.fromLivePosition)) {
            log.debug("Init: using startAt.fromLivePosition");
            const livePosition = (_a = getLivePosition(manifest)) !== null && _a !== void 0 ? _a : max;
            const { fromLivePosition } = startAt;
            return fromLivePosition >= 0
                ? livePosition
                : Math.max(min, livePosition + fromLivePosition);
        }
        else if (!isNullOrUndefined(startAt.percentage)) {
            log.debug("Init: using startAt.percentage");
            const { percentage } = startAt;
            if (percentage > 100) {
                return max;
            }
            else if (percentage < 0) {
                return min;
            }
            const ratio = +percentage / 100;
            const extent = max - min;
            return min + extent * ratio;
        }
    }
    const minimumPosition = getMinimumSafePosition(manifest);
    if (manifest.isLive) {
        const { suggestedPresentationDelay, clockOffset } = manifest;
        const maximumPosition = getMaximumSafePosition(manifest);
        let liveTime;
        const { DEFAULT_LIVE_GAP } = config.getCurrent();
        if (clockOffset === undefined) {
            log.info("Init: no clock offset found for a live content, " +
                "starting close to maximum available position");
            liveTime = maximumPosition;
        }
        else {
            log.info("Init: clock offset found for a live content, " +
                "checking if we can start close to it");
            const ast = manifest.availabilityStartTime === undefined ? 0 : manifest.availabilityStartTime;
            const clockRelativeLiveTime = (getMonotonicTimeStamp() + clockOffset) / 1000 - ast;
            liveTime = Math.min(maximumPosition, clockRelativeLiveTime);
        }
        const diffFromLiveTime = suggestedPresentationDelay !== null && suggestedPresentationDelay !== void 0 ? suggestedPresentationDelay : (lowLatencyMode ? DEFAULT_LIVE_GAP.LOW_LATENCY : DEFAULT_LIVE_GAP.DEFAULT);
        log.debug(`Init: ${liveTime} defined as the live time, applying a live gap` +
            ` of ${diffFromLiveTime}`);
        return Math.max(liveTime - diffFromLiveTime, minimumPosition);
    }
    log.info("Init: starting at the minimum available position:", minimumPosition);
    return minimumPosition;
}
