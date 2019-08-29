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
  if (periodsTimeInformations.length !== periodsIR.length) {
    throw new Error("MPD parsing error: the time informations are incoherent.");
  }

  const { parsedPeriods } = periodsIR.reverse().reduce((
    acc: {
      parsedPeriods: IParsedPeriod[];
      getLastPositionByType: Partial<Record<string, () => number|undefined>>;
    },
    periodIR, i
  ) => {
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
                          start: periodStart,
                          timeShiftBufferDepth: manifestInfos.timeShiftBufferDepth };
    const adaptations = parseAdaptationSets(periodIR.children.adaptations,
                                            periodInfos,
                                            acc.getLastPositionByType);
    const parsedPeriod : IParsedPeriod = { id: periodID,
                                           start: periodStart,
                                           end: periodEnd,
                                           duration: periodDuration,
                                           adaptations };
    acc.parsedPeriods.unshift(parsedPeriod);

    if (i === 0) {
      const types = ["video", "audio"];
      types.forEach((type) => {
        acc.getLastPositionByType[type] = () => {
          const typedAdaptations = adaptations[type];
          return typedAdaptations ?
            typedAdaptations[0].representations[0].index.getLastPosition() :
            undefined;
        };
      });
    }

    return acc;
  }, {
    parsedPeriods: [] as IParsedPeriod[],
    getLastPositionByType: {},
  });
  return flattenOverlappingPeriods(parsedPeriods);
}
