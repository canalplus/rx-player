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
var get_last_time_from_adaptation_1 = require("./get_last_time_from_adaptation");
/**
 * @param {Array.<Object>} periods
 * @returns {number | undefined}
 */
function getMaximumPosition(periods) {
    for (var i = periods.length - 1; i >= 0; i--) {
        var periodAdaptations = periods[i].adaptations;
        var firstAudioAdaptationFromPeriod = periodAdaptations.audio === undefined ? undefined : periodAdaptations.audio[0];
        var firstVideoAdaptationFromPeriod = periodAdaptations.video === undefined ? undefined : periodAdaptations.video[0];
        if (firstAudioAdaptationFromPeriod !== undefined ||
            firstVideoAdaptationFromPeriod !== undefined) {
            // null == no segment
            var maximumAudioPosition = null;
            var maximumVideoPosition = null;
            if (firstAudioAdaptationFromPeriod !== undefined) {
                var lastPosition = (0, get_last_time_from_adaptation_1.default)(firstAudioAdaptationFromPeriod);
                if (lastPosition === undefined) {
                    return { safe: undefined, unsafe: undefined };
                }
                maximumAudioPosition = lastPosition;
            }
            if (firstVideoAdaptationFromPeriod !== undefined) {
                var lastPosition = (0, get_last_time_from_adaptation_1.default)(firstVideoAdaptationFromPeriod);
                if (lastPosition === undefined) {
                    return { safe: undefined, unsafe: undefined };
                }
                maximumVideoPosition = lastPosition;
            }
            if ((firstAudioAdaptationFromPeriod !== undefined && maximumAudioPosition === null) ||
                (firstVideoAdaptationFromPeriod !== undefined && maximumVideoPosition === null)) {
                log_1.default.info("Parser utils: found Period with no segment. ", "Going to previous one to calculate last position");
                return { safe: undefined, unsafe: undefined };
            }
            if (maximumVideoPosition !== null) {
                if (maximumAudioPosition !== null) {
                    return {
                        safe: Math.min(maximumAudioPosition, maximumVideoPosition),
                        unsafe: Math.max(maximumAudioPosition, maximumVideoPosition),
                    };
                }
                return { safe: maximumVideoPosition, unsafe: maximumVideoPosition };
            }
            if (maximumAudioPosition !== null) {
                return { safe: maximumAudioPosition, unsafe: maximumAudioPosition };
            }
        }
    }
    return { safe: undefined, unsafe: undefined };
}
exports.default = getMaximumPosition;
