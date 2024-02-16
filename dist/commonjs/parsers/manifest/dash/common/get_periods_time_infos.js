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
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
/**
 * Get periods time information from current, next and previous
 * periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @return {Array.<Object>}
 */
function getPeriodsTimeInformation(periodsIR, manifestInfos) {
    var periodsTimeInformation = [];
    periodsIR.forEach(function (currentPeriod, i) {
        var periodStart;
        if (!(0, is_null_or_undefined_1.default)(currentPeriod.attributes.start)) {
            periodStart = currentPeriod.attributes.start;
        }
        else {
            if (i === 0) {
                periodStart =
                    !manifestInfos.isDynamic ||
                        (0, is_null_or_undefined_1.default)(manifestInfos.availabilityStartTime)
                        ? 0
                        : manifestInfos.availabilityStartTime;
            }
            else {
                // take time information from previous period
                var prevPeriodInfos = periodsTimeInformation[periodsTimeInformation.length - 1];
                if (!(0, is_null_or_undefined_1.default)(prevPeriodInfos) &&
                    !(0, is_null_or_undefined_1.default)(prevPeriodInfos.periodEnd)) {
                    periodStart = prevPeriodInfos.periodEnd;
                }
                else {
                    throw new Error("Missing start time when parsing periods.");
                }
            }
        }
        var periodDuration;
        var nextPeriod = periodsIR[i + 1];
        if (!(0, is_null_or_undefined_1.default)(currentPeriod.attributes.duration)) {
            periodDuration = currentPeriod.attributes.duration;
        }
        else if (i === periodsIR.length - 1) {
            periodDuration = manifestInfos.duration;
        }
        else if (!(0, is_null_or_undefined_1.default)(nextPeriod.attributes.start)) {
            periodDuration = nextPeriod.attributes.start - periodStart;
        }
        var periodEnd = !(0, is_null_or_undefined_1.default)(periodDuration)
            ? periodStart + periodDuration
            : undefined;
        periodsTimeInformation.push({ periodStart: periodStart, periodDuration: periodDuration, periodEnd: periodEnd });
    });
    return periodsTimeInformation;
}
exports.default = getPeriodsTimeInformation;
