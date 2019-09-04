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

import { IPeriodIntermediateRepresentation } from "./node_parsers/Period";
import { IManifestInfos } from "./parse_periods";

interface IPeriodTimeInformations {
  periodStart: number;
  periodDuration?: number;
  periodEnd?: number;
}

/**
 * Get periods time informations from current, next and previous
 * periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @return {Array.<Object>}
 */
export default function getPeriodsTimeInformations(
  periodsIR: IPeriodIntermediateRepresentation[],
  manifestInfos: IManifestInfos
): IPeriodTimeInformations[] {
  const periodsTimeInformations: IPeriodTimeInformations[] = [];
  periodsIR.forEach((currentPeriod, i) => {

    let periodStart : number;
    if (currentPeriod.attributes.start != null) {
      periodStart = currentPeriod.attributes.start;
    } else {
      if (i === 0) {
        periodStart = (!manifestInfos.isDynamic ||
                       manifestInfos.availabilityStartTime == null) ?
                         0 :
                         manifestInfos.availabilityStartTime;
      } else {
        // take time informations from previous period
        const prevPeriodInfos =
          periodsTimeInformations[periodsTimeInformations.length - 1];
        if (prevPeriodInfos != null && prevPeriodInfos.periodEnd != null) {
          periodStart = prevPeriodInfos.periodEnd;
        } else {
          throw new Error("Missing start time when parsing periods.");
        }
      }
    }

    let periodDuration : number | undefined;
    const nextPeriod = periodsIR[i + 1];
    if (currentPeriod.attributes.duration != null) {
      periodDuration = currentPeriod.attributes.duration;
    } else if (i === periodsIR.length - 1) {
      periodDuration = manifestInfos.duration;
    } else if (nextPeriod.attributes.start != null) {
      periodDuration = nextPeriod.attributes.start - periodStart;
    }

    const periodEnd = periodDuration != null ? (periodStart + periodDuration) :
                                               undefined;
    periodsTimeInformations.push({ periodStart,
                                   periodDuration,
                                   periodEnd });
  });
  return periodsTimeInformations;
}
