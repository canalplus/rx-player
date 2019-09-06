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
import LiveEdgeCalculator from "./live_edge_calculator";
import { IPeriodIntermediateRepresentation } from "./node_parsers/Period";
import parseAdaptationSets from "./parse_adaptation_sets";

const generatePeriodID = idGenerator();

export interface IManifestInfos {
  availabilityStartTime : number; // Time from which the content starts
  baseURL? : string;
  clockOffset? : number;
  duration? : number;
  liveEdgeCalculator : LiveEdgeCalculator; // Allows to obtain the live edge of
                                           // the whole MPD at any time, once it
                                           // is known
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
  if (periodsTimeInformations.length !== periodsIR.length) {
    throw new Error("MPD parsing error: the time informations are incoherent.");
  }

  const parsedPeriods : IParsedPeriod[] = [];

  // XXX TODO
  // We parse it in reverse because if not define, we need to obtain the live
  // edge from the last index which actually
  const { liveEdgeCalculator } = manifestInfos;
  for (let i = periodsIR.length - 1; i >= 0; i--) {
    const periodIR = periodsIR[i];
    const periodBaseURL = resolveURL(manifestInfos.baseURL, periodIR.children.baseURL);

    const { periodStart,
            periodDuration,
            periodEnd } =
      periodsTimeInformations[periodsTimeInformations.length - (i + 1)];

    let periodID : string;
    if (periodIR.attributes.id == null) {
      log.warn("DASH: No usable id found in the Period. Generating one.");
      periodID = "gen-dash-period-" + generatePeriodID();
    } else {
      periodID = periodIR.attributes.id;
    }

    const periodInfos = { availabilityStartTime: manifestInfos.availabilityStartTime,
                          baseURL: periodBaseURL,
                          clockOffset: manifestInfos.clockOffset,
                          end: periodEnd,
                          isDynamic: manifestInfos.isDynamic,
                          liveEdgeCalculator: manifestInfos.liveEdgeCalculator,
                          start: periodStart,
                          timeShiftBufferDepth: manifestInfos.timeShiftBufferDepth };
    const adaptations = parseAdaptationSets(periodIR.children.adaptations,
                                            periodInfos);
    const parsedPeriod : IParsedPeriod = { id: periodID,
                                           start: periodStart,
                                           end: periodEnd,
                                           duration: periodDuration,
                                           adaptations };
    parsedPeriods.push(parsedPeriod);

    // XXX TODO
    if (!liveEdgeCalculator.knowCurrentLiveEdge()) {
      // TODO check each representation of the first adaptation
      // If some (at least one) has some kind of last position set, set the
      // minimum between all of them as the live edge
      // If not, check through Date.now() and period.start if this looks like
      // the current period:
      //   - if Date.now() is before period.start + availabilityStartTime, parse
      //     previous period
      //   - if Date.now() is in or even before the period, set date.now() minus
      //     something as the live edge
    }
  }
  return flattenOverlappingPeriods(parsedPeriods);
}
