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
import getFirstPositionFromAdaptation from "./get_first_time_from_adaptation";
/**
 * @param {Array.<Object>} periods
 * @returns {number | undefined}
 */
export default function getMinimumPosition(periods) {
    for (let i = 0; i <= periods.length - 1; i++) {
        const periodAdaptations = periods[i].adaptations;
        const firstAudioAdaptationFromPeriod = periodAdaptations.audio === undefined ? undefined : periodAdaptations.audio[0];
        const firstVideoAdaptationFromPeriod = periodAdaptations.video === undefined ? undefined : periodAdaptations.video[0];
        if (firstAudioAdaptationFromPeriod !== undefined ||
            firstVideoAdaptationFromPeriod !== undefined) {
            // null == no segment
            let minimumAudioPosition = null;
            let minimumVideoPosition = null;
            if (firstAudioAdaptationFromPeriod !== undefined) {
                const firstPosition = getFirstPositionFromAdaptation(firstAudioAdaptationFromPeriod);
                if (firstPosition === undefined) {
                    return undefined;
                }
                minimumAudioPosition = firstPosition;
            }
            if (firstVideoAdaptationFromPeriod !== undefined) {
                const firstPosition = getFirstPositionFromAdaptation(firstVideoAdaptationFromPeriod);
                if (firstPosition === undefined) {
                    return undefined;
                }
                minimumVideoPosition = firstPosition;
            }
            if ((firstAudioAdaptationFromPeriod !== undefined && minimumAudioPosition === null) ||
                (firstVideoAdaptationFromPeriod !== undefined && minimumVideoPosition === null)) {
                log.info("Parser utils: found Period with no segment. ", "Going to next one to calculate first position");
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
