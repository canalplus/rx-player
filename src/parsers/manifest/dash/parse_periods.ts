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
import flatMap from "../../../utils/flat_map";
import idGenerator from "../../../utils/id_generator";
import objectValues from "../../../utils/object_values";
import resolveURL from "../../../utils/resolve_url";
import {
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedPeriod,
} from "../types";
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
  const parsedPeriods : IParsedPeriod[] = [];
  const periodsTimeInformations = getPeriodsTimeInformations(periodsIR, manifestInfos);
  if (periodsTimeInformations.length !== periodsIR.length) {
    throw new Error("MPD parsing error: the time informations are incoherent.");
  }

  // We parse it in reverse because we might need to deduce the live edge from
  // the last Periods' indexes
  const { liveEdgeCalculator } = manifestInfos;
  for (let i = periodsIR.length - 1; i >= 0; i--) {
    const periodIR = periodsIR[i];
    const periodBaseURL = resolveURL(manifestInfos.baseURL, periodIR.children.baseURL);

    const { periodStart,
            periodDuration,
            periodEnd } = periodsTimeInformations[i];

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

    if (!liveEdgeCalculator.knowCurrentLiveEdge()) {
      const lastPosition = getMaximumLastPosition(adaptations);
      if (lastPosition !== null) {
        let liveEdgeOffset : number;
        if (typeof lastPosition === "number") {
          liveEdgeOffset = lastPosition +
                           manifestInfos.availabilityStartTime -
                           performance.now() / 1000;
        } else {
          log.warn("DASH Parser: no clock synchronization mechanism found." +
                   " Setting a live gap of 10 seconds relatively to the system " +
                   "clock as a security.");
          liveEdgeOffset = (Date.now() - 10000 - performance.now()) / 1000;
        }
        liveEdgeCalculator.setLiveEdgeOffset(liveEdgeOffset);
      }
    }
  }
  return flattenOverlappingPeriods(parsedPeriods);
}

/**
 * Try to extract the last position declared for any segments in a Period:
 *   - If at least a single index' last position is defined, take the maximum
 *     among them.
 *   - If segments are available but we cannot define the last position
 *     return undefined.
 *   - If no segment are available in that period, return null
 * @param {Object} adaptationsPerType
 * @returns {number|null|undefined}
 */
function getMaximumLastPosition(
  adaptationsPerType : IParsedAdaptations
) : number | null | undefined {
  let maxEncounteredPosition : number | null = null;
  let allIndexAreEmpty = true;
  const adaptationsVal = objectValues(adaptationsPerType)
    .filter((ada) : ada is IParsedAdaptation[] => ada != null);
  const allAdaptations = flatMap(adaptationsVal,
                                 (adaptationsForType) => adaptationsForType);
  for (let adapIndex = 0; adapIndex < allAdaptations.length; adapIndex++) {
    const representations = allAdaptations[adapIndex].representations;
    for (let repIndex = 0; repIndex < representations.length; repIndex++) {
      const representation = representations[repIndex];
      const position = representation.index.getLastPosition();
      if (position !== null) {
        allIndexAreEmpty = false;
        if (typeof position === "number") {
          maxEncounteredPosition =
            maxEncounteredPosition == null ? position :
                                             Math.max(maxEncounteredPosition,
                                                      position);
        }
      }
    }
  }

  if (maxEncounteredPosition != null) {
    return maxEncounteredPosition;
  } else if (allIndexAreEmpty) {
    return null;
  }
  return undefined;
}
