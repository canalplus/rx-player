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
import getLastPositionFromAdaptation from "./get_last_time_from_adaptation";
/**
 * @param {Array.<Object>} periods
 * @returns {number | undefined}
 */
export default function getMaximumPosition(periods) {
    for (let i = periods.length - 1; i >= 0; i--) {
        const periodAdaptations = periods[i].adaptations;
        const firstAudioAdaptationFromPeriod = periodAdaptations.audio === undefined ? undefined : periodAdaptations.audio[0];
        const firstVideoAdaptationFromPeriod = periodAdaptations.video === undefined ? undefined : periodAdaptations.video[0];
        if (firstAudioAdaptationFromPeriod !== undefined ||
            firstVideoAdaptationFromPeriod !== undefined) {
            // null == no segment
            let maximumAudioPosition = null;
            let maximumVideoPosition = null;
            if (firstAudioAdaptationFromPeriod !== undefined) {
                const lastPosition = getLastPositionFromAdaptation(firstAudioAdaptationFromPeriod);
                if (lastPosition === undefined) {
                    return { safe: undefined, unsafe: undefined };
                }
                maximumAudioPosition = lastPosition;
            }
            if (firstVideoAdaptationFromPeriod !== undefined) {
                const lastPosition = getLastPositionFromAdaptation(firstVideoAdaptationFromPeriod);
                if (lastPosition === undefined) {
                    return { safe: undefined, unsafe: undefined };
                }
                maximumVideoPosition = lastPosition;
            }
            if ((firstAudioAdaptationFromPeriod !== undefined && maximumAudioPosition === null) ||
                (firstVideoAdaptationFromPeriod !== undefined && maximumVideoPosition === null)) {
                log.info("Parser utils: found Period with no segment. ", "Going to previous one to calculate last position");
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
