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
import idGenerator from "../../../utils/id_generator";
import resolveURL from "../../../utils/resolve_url";
import { IParsedPeriod } from "../types";
import flattenOverlappingPeriods from "./flatten_overlapping_periods";
import getPeriodsTimeInformations from "./get_periods_time_infos";
import { IPeriodIntermediateRepresentation } from "./node_parsers/Period";
import parseAdaptationSets from "./parse_adaptation_sets";

const generatePeriodID = idGenerator();

export interface IManifestInfos {
  availabilityStartTime : number; // Time from which the content starts
  baseURL? : string;
  clockOffset? : number;
  duration? : number;
  isDynamic : boolean;
  timeShiftBufferDepth? : number; // Depth of the buffer for the whole content,
                                  // in seconds
}

/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @returns {Array.<Object>}
 */
export default function parsePeriods(
  periodsIR : IPeriodIntermediateRepresentation[],
  manifestInfos : IManifestInfos
): IParsedPeriod[] {
  const periodsTimeInformations = getPeriodsTimeInformations(periodsIR, manifestInfos);
  const parsedPeriods : IParsedPeriod[] = [];

  for (let i = 0; i < periodsIR.length; i++) {
    const period = periodsIR[i];
    const { periodStart,
            periodDuration,
            periodEnd,
    } = periodsTimeInformations[i];

    const periodBaseURL = resolveURL(manifestInfos.baseURL, period.children.baseURL);

    let periodID : string;
    if (period.attributes.id == null) {
      log.warn("DASH: No usable id found in the Period. Generating one.");
      periodID = "gen-dash-period-" + generatePeriodID();
    } else {
      periodID = period.attributes.id;
    }

    const periodInfos = { availabilityStartTime: manifestInfos.availabilityStartTime,
                          baseURL: periodBaseURL,
                          clockOffset: manifestInfos.clockOffset,
                          end: periodEnd,
                          isDynamic: manifestInfos.isDynamic,
                          start: periodStart,
                          timeShiftBufferDepth: manifestInfos.timeShiftBufferDepth };
    const adaptations = parseAdaptationSets(period.children.adaptations,
                                            periodInfos);
    const parsedPeriod : IParsedPeriod = { id: periodID,
                                           start: periodStart,
                                           end: periodEnd,
                                           duration: periodDuration,
                                           adaptations };
    parsedPeriods.push(parsedPeriod);
  }
  return flattenOverlappingPeriods(parsedPeriods);
}
