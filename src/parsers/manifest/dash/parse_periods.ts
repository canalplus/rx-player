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
import BufferDepthCalculator from "./buffer_depth_calculator";
import flattenOverlappingPeriods from "./flatten_overlapping_periods";
import getPeriodsTimeInformations from "./get_periods_time_infos";
import { IPeriodIntermediateRepresentation } from "./node_parsers/Period";
import parseAdaptationSets from "./parse_adaptation_sets";

const generatePeriodID = idGenerator();

export interface IManifestInfos {
  availabilityStartTime : number; // Time from which the content starts
  baseURL? : string;
  bufferDepthCalculator : BufferDepthCalculator; // Allows to obtain the first
                                                 // available position of a live
                                                 // content
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
  const parsedPeriods : IParsedPeriod[] = [];
  const periodsTimeInformations = getPeriodsTimeInformations(periodsIR, manifestInfos);
  if (periodsTimeInformations.length !== periodsIR.length) {
    throw new Error("MPD parsing error: the time informations are incoherent.");
  }

  // We parse it in reverse because we might need to deduce the buffer depth from
  // the last Periods' indexes
  const { bufferDepthCalculator } = manifestInfos;
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
                          bufferDepthCalculator: manifestInfos.bufferDepthCalculator,
                          clockOffset: manifestInfos.clockOffset,
                          end: periodEnd,
                          isDynamic: manifestInfos.isDynamic,
                          start: periodStart,
                          timeShiftBufferDepth: manifestInfos.timeShiftBufferDepth };
    const adaptations = parseAdaptationSets(periodIR.children.adaptations,
                                            periodInfos);
    const parsedPeriod : IParsedPeriod = { id: periodID,
                                           start: periodStart,
                                           end: periodEnd,
                                           duration: periodDuration,
                                           adaptations };
    parsedPeriods.unshift(parsedPeriod);

    if (manifestInfos.isDynamic && !bufferDepthCalculator.lastPositionIsKnown()) {
      // Try to guess last position to obtain the buffer depth
      const lastPosition = getMaximumLastPosition(adaptations);
      if (typeof lastPosition === "number") { // last position is available
        const lastPositionOffset = lastPosition - performance.now() / 1000;
        bufferDepthCalculator.setLastPositionOffset(lastPositionOffset);
      } else {
        const lastPositionOffset = guessLastPositionOffsetFromClock(manifestInfos,
                                                                    periodStart);
        if (lastPositionOffset != null) {
          bufferDepthCalculator.setLastPositionOffset(lastPositionOffset);
        }
      }
    }
  }

  if (manifestInfos.isDynamic && !bufferDepthCalculator.lastPositionIsKnown()) {
    // Guess a last time the last position
    const lastPositionOffset = guessLastPositionOffsetFromClock(manifestInfos, 0);
    if (lastPositionOffset != null) {
      bufferDepthCalculator.setLastPositionOffset(lastPositionOffset);
    }
  }
  return flattenOverlappingPeriods(parsedPeriods);
}

/**
 * Try to guess the "last position offset" - which is the last position
 * available in the manifest in seconds to which is substracted
 * `performance.now()` - from the clock (either the system's or the server's if
 * one).
 *
 * This value allows to retrieve at any time in the future the new last
 * position, by adding to it the new value returned by `performance.now`.
 *
 * The last position position offset is returned by this function if and only if
 * it would indicate a last position superior to the `minimumTime` given.
 *
 * This last part allows for example to detect which Period is likely to be the
 * "live" one in multi-periods contents. By giving the Period's start as a
 * `minimumTime`, you ensure that you will get a value only if the live time is
 * in that period.
 *
 * This is useful as guessing the live time from the clock can be seen as a last
 * resort. By detecting that the live time is before the currently considered
 * Period, we can just parse and look at the previous Period. If we can guess
 * the live time more directly from that previous one, we might be better off
 * than just using the clock.
 *
 * @param {Object} manifestInfos
 * @param {number} minimumTime
 * @returns {number|undefined}
 */
function guessLastPositionOffsetFromClock(
  manifestInfos : IManifestInfos,
  minimumTime : number
) : number | undefined {
  if (manifestInfos.clockOffset != null) {
    const timeInSec = (performance.now() + manifestInfos.clockOffset) / 1000 -
                      manifestInfos.availabilityStartTime;
    if (timeInSec >= minimumTime) {
      return manifestInfos.clockOffset / 1000 -
               manifestInfos.availabilityStartTime;
    }
  } else {
    const now = (Date.now() - 10000) / 1000;
    if (now >= minimumTime) {
      log.warn("DASH Parser: no clock synchronization mechanism found." +
               " Setting a live gap of 10 seconds relatively to the " +
               "system clock as a security.");
      return now - manifestInfos.availabilityStartTime -
             performance.now() / 1000;
    }
  }
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
