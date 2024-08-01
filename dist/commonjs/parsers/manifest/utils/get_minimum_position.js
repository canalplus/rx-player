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
var log_1 = require("../../../log");
var get_first_time_from_adaptation_1 = require("./get_first_time_from_adaptation");
/**
 * @param {Array.<Object>} periods
 * @returns {number | undefined}
 */
function getMinimumPosition(periods) {
    for (var i = 0; i <= periods.length - 1; i++) {
        var periodAdaptations = periods[i].adaptations;
        var firstAudioAdaptationFromPeriod = periodAdaptations.audio === undefined ? undefined : periodAdaptations.audio[0];
        var firstVideoAdaptationFromPeriod = periodAdaptations.video === undefined ? undefined : periodAdaptations.video[0];
        if (firstAudioAdaptationFromPeriod !== undefined ||
            firstVideoAdaptationFromPeriod !== undefined) {
            // null == no segment
            var minimumAudioPosition = null;
            var minimumVideoPosition = null;
            if (firstAudioAdaptationFromPeriod !== undefined) {
                var firstPosition = (0, get_first_time_from_adaptation_1.default)(firstAudioAdaptationFromPeriod);
                if (firstPosition === undefined) {
                    return undefined;
                }
                minimumAudioPosition = firstPosition;
            }
            if (firstVideoAdaptationFromPeriod !== undefined) {
                var firstPosition = (0, get_first_time_from_adaptation_1.default)(firstVideoAdaptationFromPeriod);
                if (firstPosition === undefined) {
                    return undefined;
                }
                minimumVideoPosition = firstPosition;
            }
            if ((firstAudioAdaptationFromPeriod !== undefined && minimumAudioPosition === null) ||
                (firstVideoAdaptationFromPeriod !== undefined && minimumVideoPosition === null)) {
                log_1.default.info("Parser utils: found Period with no segment. ", "Going to next one to calculate first position");
                return undefined;
            }
            if (minimumVideoPosition !== null) {
                if (minimumAudioPosition !== null) {
                    return Math.max(minimumAudioPosition, minimumVideoPosition);
                }
                return minimumVideoPosition;
            }
            if (minimumAudioPosition !== null) {
                return minimumAudioPosition;
            }
        }
    }
}
exports.default = getMinimumPosition;
