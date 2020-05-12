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
import Manifest from "../../../manifest";
import flatMap from "../../../utils/flat_map";
import idGenerator from "../../../utils/id_generator";
import objectValues from "../../../utils/object_values";
import {
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedPeriod,
} from "../types";
import extractMinimumAvailabilityTimeOffset from "./extract_minimum_availability_time_offset";
import flattenOverlappingPeriods from "./flatten_overlapping_periods";
import getPeriodsTimeInformation from "./get_periods_time_infos";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import { IPeriodIntermediateRepresentation } from "./node_parsers/Period";
import parseAdaptationSets from "./parse_adaptation_sets";
import resolveBaseURLs from "./resolve_base_urls";

const generatePeriodID = idGenerator();

/** Information about each linked Xlink. */
export type IXLinkInfos = WeakMap<IPeriodIntermediateRepresentation, {
  /** Real URL (post-redirection) used to download this xlink. */
  url? : string;
  /** Time at which the request was sent (since the time origin), in ms. */
  sendingTime? : number;
  /** Time at which the request was received (since the time origin), in ms. */
  receivedTime? : number;
}>;

/** Context needed when calling `parsePeriods`. */
export interface IPeriodsContextInfos {
  /** Whether we should request new segments even if they are not yet finished. */
  aggressiveMode : boolean;
  availabilityTimeOffset: number;
  availabilityStartTime : number;
  baseURLs : string[];
  clockOffset? : number;
  duration? : number;
  isDynamic : boolean;
  /**
   * Time (in terms of `performance.now`) at which the XML file containing this
   * Period was received.
   */
  receivedTime? : number;
  /** Depth of the buffer for the whole content, in seconds. */
  timeShiftBufferDepth? : number;
  /**
   * The parser should take this Manifest - which is a previously parsed
   * Manifest for the same dynamic content - as a base to speed-up the parsing
   * process.
   * /!\ If unexpected differences exist between the two, there is a risk of
   * de-synchronization with what is actually on the server,
   * Use with moderation.
   */
  unsafelyBaseOnPreviousManifest : Manifest | null;
  xlinkInfos : IXLinkInfos;
}

/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} contextInfos
 * @returns {Array.<Object>}
 */
  export default function parsePeriods(
  periodsIR : IPeriodIntermediateRepresentation[],
  contextInfos : IPeriodsContextInfos
): IParsedPeriod[] {
  const parsedPeriods : IParsedPeriod[] = [];
  const periodsTimeInformation = getPeriodsTimeInformation(periodsIR, contextInfos);
  if (periodsTimeInformation.length !== periodsIR.length) {
    throw new Error("MPD parsing error: the time information are incoherent.");
  }

  const { isDynamic,
          timeShiftBufferDepth } = contextInfos;
  const manifestBoundsCalculator = new ManifestBoundsCalculator({ isDynamic,
                                                                  timeShiftBufferDepth });

  if (!isDynamic && contextInfos.duration != null) {
    manifestBoundsCalculator.setLastPosition(contextInfos.duration);
  }

  // We parse it in reverse because we might need to deduce the buffer depth from
  // the last Periods' indexes
  for (let i = periodsIR.length - 1; i >= 0; i--) {
    const periodIR = periodsIR[i];
    const xlinkInfos = contextInfos.xlinkInfos.get(periodIR);
    const periodBaseURLs = resolveBaseURLs(contextInfos.baseURLs,
                                           periodIR.children.baseURLs);

    const { periodStart,
            periodDuration,
            periodEnd } = periodsTimeInformation[i];

    let periodID : string;
    if (periodIR.attributes.id == null) {
      log.warn("DASH: No usable id found in the Period. Generating one.");
      periodID = "gen-dash-period-" + generatePeriodID();
    } else {
      periodID = periodIR.attributes.id;
    }

    // Avoid duplicate IDs
    while (parsedPeriods.some(p => p.id === periodID)) {
      periodID += "-dup";
    }

    const receivedTime = xlinkInfos !== undefined ? xlinkInfos.receivedTime :
                                                    contextInfos.receivedTime;

    const availabilityTimeOffset =
      extractMinimumAvailabilityTimeOffset(periodIR.children.baseURLs) +
      contextInfos.availabilityTimeOffset;

    const unsafelyBaseOnPreviousPeriod = contextInfos
      .unsafelyBaseOnPreviousManifest?.getPeriod(periodID) ?? null;

    const periodInfos = { aggressiveMode: contextInfos.aggressiveMode,
                          availabilityTimeOffset,
                          baseURLs: periodBaseURLs,
                          manifestBoundsCalculator,
                          end: periodEnd,
                          isDynamic,
                          receivedTime,
                          start: periodStart,
                          timeShiftBufferDepth,
                          unsafelyBaseOnPreviousPeriod };
    const adaptations = parseAdaptationSets(periodIR.children.adaptations,
                                            periodInfos);
    const streamEvents = periodIR.children.streamEvents;
    const parsedPeriod : IParsedPeriod = { id: periodID,
                                           start: periodStart,
                                           end: periodEnd,
                                           duration: periodDuration,
                                           adaptations,
                                           streamEvents };
    parsedPeriods.unshift(parsedPeriod);

    if (!manifestBoundsCalculator.lastPositionIsKnown()) {
      const lastPosition = getMaximumLastPosition(adaptations);
      if (!isDynamic) {
        if (typeof lastPosition === "number") {
          manifestBoundsCalculator.setLastPosition(lastPosition);
        }
      } else {
        if (typeof lastPosition === "number") {
          const positionTime = performance.now() / 1000;
          manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
        } else {
          const guessedLastPositionFromClock =
            guessLastPositionFromClock(contextInfos, periodStart);
          if (guessedLastPositionFromClock !== undefined) {
            const [guessedLastPosition, guessedPositionTime] =
              guessedLastPositionFromClock;
            manifestBoundsCalculator.setLastPosition(
              guessedLastPosition, guessedPositionTime);
          }
        }
      }
    }
  }

  if (contextInfos.isDynamic && !manifestBoundsCalculator.lastPositionIsKnown()) {
    // Guess a last time the last position
    const guessedLastPositionFromClock = guessLastPositionFromClock(contextInfos, 0);
    if (guessedLastPositionFromClock !== undefined) {
      const [lastPosition, positionTime] = guessedLastPositionFromClock;
      manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
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
 * "current" one in multi-periods contents. By giving the Period's start as a
 * `minimumTime`, you ensure that you will get a value only if the current time
 * is in that period.
 *
 * This is useful as guessing the live time from the clock can be seen as a last
 * resort. By detecting that the current time is before the currently considered
 * Period, we can just parse and look at the previous Period. If we can guess
 * the live time more directly from that previous one, we might be better off
 * than just using the clock.
 *
 * @param {Object} contextInfos
 * @param {number} minimumTime
 * @returns {Array.<number|undefined>}
 */
function guessLastPositionFromClock(
  contextInfos : IPeriodsContextInfos,
  minimumTime : number
) : [number, number] | undefined {
  if (contextInfos.clockOffset != null) {
    const lastPosition = contextInfos.clockOffset / 1000 -
      contextInfos.availabilityStartTime;
    const positionTime = performance.now() / 1000;
    const timeInSec = positionTime + lastPosition;
    if (timeInSec >= minimumTime) {
      return [timeInSec, positionTime];
    }
  } else {
    const now = Date.now() / 1000;
    if (now >= minimumTime) {
      log.warn("DASH Parser: no clock synchronization mechanism found." +
               " Using the system clock instead.");
      const lastPosition = now - contextInfos.availabilityStartTime;
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
