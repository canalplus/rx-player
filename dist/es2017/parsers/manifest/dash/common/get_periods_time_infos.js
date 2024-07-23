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
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
/**
 * Get periods time information from current, next and previous
 * periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @return {Array.<Object>}
 */
export default function getPeriodsTimeInformation(periodsIR, manifestInfos) {
    const periodsTimeInformation = [];
    periodsIR.forEach((currentPeriod, i) => {
        let periodStart;
        if (!isNullOrUndefined(currentPeriod.attributes.start)) {
            periodStart = currentPeriod.attributes.start;
        }
        else {
            if (i === 0) {
                periodStart =
                    !manifestInfos.isDynamic ||
                        isNullOrUndefined(manifestInfos.availabilityStartTime)
                        ? 0
                        : manifestInfos.availabilityStartTime;
            }
            else {
                // take time information from previous period
                const prevPeriodInfos = periodsTimeInformation[periodsTimeInformation.length - 1];
                if (!isNullOrUndefined(prevPeriodInfos) &&
                    !isNullOrUndefined(prevPeriodInfos.periodEnd)) {
                    periodStart = prevPeriodInfos.periodEnd;
                }
                else {
                    throw new Error("Missing start time when parsing periods.");
                }
            }
        }
        let periodDuration;
        const nextPeriod = periodsIR[i + 1];
        if (!isNullOrUndefined(currentPeriod.attributes.duration)) {
            periodDuration = currentPeriod.attributes.duration;
        }
        else if (i === periodsIR.length - 1) {
            periodDuration = manifestInfos.duration;
        }
        else if (!isNullOrUndefined(nextPeriod.attributes.start)) {
            periodDuration = nextPeriod.attributes.start - periodStart;
        }
        const periodEnd = !isNullOrUndefined(periodDuration)
            ? periodStart + periodDuration
            : undefined;
        periodsTimeInformation.push({ periodStart, periodDuration, periodEnd });
    });
    return periodsTimeInformation;
}
