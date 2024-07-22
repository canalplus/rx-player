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
import type { IPeriodIntermediateRepresentation } from "../node_parser_types";
/** Time information from a Period. */
interface IPeriodTimeInformation {
    /** Time in seconds at which the Period starts. */
    periodStart: number;
    /** Difference in seconds between the Period's end and its start. */
    periodDuration?: number | undefined;
    /** Time in seconds at which the Period ends. */
    periodEnd?: number | undefined;
}
/** Additionnal context needed to retrieve the period time information. */
export interface IParsedPeriodsContext {
    /** Value of MPD@availabilityStartTime. */
    availabilityStartTime: number;
    /** Value of MPD@mediaPresentationDuration. */
    duration?: number | undefined;
    /** `true` if MPD@type is equal to "dynamic". */
    isDynamic: boolean;
}
/**
 * Get periods time information from current, next and previous
 * periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @return {Array.<Object>}
 */
export default function getPeriodsTimeInformation(periodsIR: IPeriodIntermediateRepresentation[], manifestInfos: IParsedPeriodsContext): IPeriodTimeInformation[];
export {};
//# sourceMappingURL=get_periods_time_infos.d.ts.map