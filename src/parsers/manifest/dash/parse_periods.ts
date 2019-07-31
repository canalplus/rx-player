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
  lowLatencyMode : boolean;
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
  const parsedPeriods : IParsedPeriod[] = [];
  for (let i = 0; i < periodsIR.length; i++) {
    const period = periodsIR[i];
    const periodBaseURL = resolveURL(manifestInfos.baseURL, period.children.baseURL);

    // 2. Generate ID
    let periodID : string;
    if (period.attributes.id == null) {
      log.warn("DASH: No usable id found in the Period. Generating one.");
      periodID = "gen-dash-period-" + generatePeriodID();
    } else {
      periodID = period.attributes.id;
    }

    // 3. Find the start of the Period (required)
    let periodStart : number;
    if (period.attributes.start != null) {
      periodStart = period.attributes.start;
    } else {
      if (i === 0) {
        periodStart = (!manifestInfos.isDynamic ||
                       manifestInfos.availabilityStartTime == null) ?
                         0 :
                         manifestInfos.availabilityStartTime;
      } else {
        const prevPeriod = parsedPeriods[i - 1];
        if (prevPeriod && prevPeriod.duration != null && prevPeriod.start != null) {
          periodStart = prevPeriod.start + prevPeriod.duration;
        } else {
          throw new Error("Missing start time when parsing periods.");
        }
      }
    }

    if (i > 0 && parsedPeriods[i - 1].duration === undefined) {
      parsedPeriods[i - 1].duration = periodStart - parsedPeriods[i - 1].start;
    }

    let periodDuration : number|undefined;
    if (period.attributes.duration != null) {
      periodDuration = period.attributes.duration;
    } else if (i === 0 && manifestInfos.duration) {
      periodDuration = manifestInfos.duration;
    }

    const periodEnd = periodDuration != null ? (periodStart + periodDuration) :
                                               undefined;

    const periodInfos = { availabilityStartTime: manifestInfos.availabilityStartTime,
                          baseURL: periodBaseURL,
                          clockOffset: manifestInfos.clockOffset,
                          end: periodEnd,
                          isDynamic: manifestInfos.isDynamic,
                          start: periodStart,
                          timeShiftBufferDepth: manifestInfos.timeShiftBufferDepth,
                          lowLatencyMode: manifestInfos.lowLatencyMode };
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
