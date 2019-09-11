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
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
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
  const parsedPeriods : IParsedPeriod[] = [];
  const periodsTimeInformations = getPeriodsTimeInformations(periodsIR, manifestInfos);
  if (periodsTimeInformations.length !== periodsIR.length) {
    throw new Error("MPD parsing error: the time informations are incoherent.");
  }

  // We parse it in reverse because we might need to deduce the buffer depth from
  // the last Periods' indexes

  const { availabilityStartTime, isDynamic, timeShiftBufferDepth } = manifestInfos;
  // We might to communicate the depth of the Buffer while parsing
  const manifestBoundsCalculator = new ManifestBoundsCalculator({ availabilityStartTime,
                                                                  isDynamic,
                                                                  timeShiftBufferDepth });
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
                          manifestBoundsCalculator,
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

    if (!manifestBoundsCalculator.lastPositionIsKnown()) {
      if (manifestInfos.isDynamic) {
        // Try to guess last position to obtain the buffer depth
        const lastPosition = getMaximumLastPosition(adaptations);
        if (typeof lastPosition === "number") { // last position is available
          const positionTime = performance.now() / 1000;
          manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
        } else {
          const guessedLastPositionFromClock =
            guessLastPositionFromClock(manifestInfos, periodStart);
          if (guessedLastPositionFromClock !== undefined) {
            const [guessedLastPosition, guessedPositionTime] =
              guessedLastPositionFromClock;
            manifestBoundsCalculator.setLastPosition(
              guessedLastPosition, guessedPositionTime);
          }
        }
      } else if (manifestInfos.duration != null) {
        manifestBoundsCalculator.setLastPosition(manifestInfos.duration);
      }
    }
  }
  if (!manifestBoundsCalculator.lastPositionIsKnown()) {
    if (manifestInfos.isDynamic) {
      // Guess a last time the last position
      const guessedLastPositionFromClock =
        guessLastPositionFromClock(manifestInfos, 0);
      if (guessedLastPositionFromClock !== undefined) {
        const [lastPosition, positionTime] = guessedLastPositionFromClock;
        manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
      }
    } else if (manifestInfos.duration != null) {
      manifestBoundsCalculator.setLastPosition(manifestInfos.duration);
    }
  }
  return flattenOverlappingPeriods(parsedPeriods);
}

/**
 * Try to guess the "last position", which is the last position
 * available in the manifest in seconds, and the "position time", the time
 * (`performance.now()`) in which the last position was collected.
 *
 * These values allows to retrieve at any time in the future the new last
 * position, by substracting the position time to the last position, and
 * adding to it the new value returned by `performance.now`.
 *
 * The last position and position time are returned by this function if and only if
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
 * @returns {Array.<number|undefined>}
 */
function guessLastPositionFromClock(
  manifestInfos : IManifestInfos,
  minimumTime : number
) : [number, number] | undefined {
  if (manifestInfos.clockOffset != null) {
    const lastPosition = manifestInfos.clockOffset / 1000 -
      manifestInfos.availabilityStartTime;
    const positionTime = performance.now() / 1000;
    const timeInSec = positionTime + lastPosition;
    if (timeInSec >= minimumTime) {
      return [timeInSec, positionTime];
    }
  } else {
    const now = (Date.now() - 10000) / 1000;
    if (now >= minimumTime) {
      log.warn("DASH Parser: no clock synchronization mechanism found." +
               " Setting a live gap of 10 seconds relatively to the " +
               "system clock as a security.");
      const lastPosition = now - manifestInfos.availabilityStartTime;
      const positionTime = performance.now() / 1000;
      return [lastPosition, positionTime];
    }
  }
  return undefined;
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
