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
import idGenerator from "../../../utils/id_generator";
import { IParsedPeriod } from "../types";
// eslint-disable-next-line max-len
import extractMinimumAvailabilityTimeOffset from "./extract_minimum_availability_time_offset";
import flattenOverlappingPeriods from "./flatten_overlapping_periods";
import getPeriodsTimeInformation from "./get_periods_time_infos";
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
  availabilityStartTime : number;
  availabilityTimeOffset: number;
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
          timeShiftBufferDepth,
          availabilityStartTime,
          clockOffset } = contextInfos;

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
                          availabilityStartTime,
                          availabilityTimeOffset,
                          baseURLs: periodBaseURLs,
                          clockOffset,
                          end: periodEnd,
                          isDynamic,
                          receivedTime,
                          segmentTemplate: periodIR.children.segmentTemplate,
                          start: periodStart,
                          timeShiftBufferDepth,
                          unsafelyBaseOnPreviousPeriod };
    const adaptations = parseAdaptationSets(periodIR.children.adaptations,
                                            periodInfos);
    const streamEvents = periodIR.children.streamEvents?.map((event) => {
      const start = ((event.eventPresentationTime ?? 0) / event.timescale) + periodStart;
      const end =
        event.duration !== undefined ? start + event.duration / event.timescale :
                                       undefined;
      return { start,
               end,
               data: event.data,
               id: event.id };
    });
    const parsedPeriod : IParsedPeriod = { id: periodID,
                                           start: periodStart,
                                           end: periodEnd,
                                           duration: periodDuration,
                                           adaptations,
                                           streamEvents };
    parsedPeriods.unshift(parsedPeriod);
  }

  return flattenOverlappingPeriods(parsedPeriods);
}

