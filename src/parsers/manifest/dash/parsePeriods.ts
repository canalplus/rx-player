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
import generateNewId from "../../../utils/id";
import { resolveURL } from "../../../utils/url";
import { IParsedPeriod } from "../types";
import { IPeriodIntermediateRepresentation } from "./node_parsers/Period";
import parseAdaptationSets from "./parseAdaptationSets";

export interface IManifestInfos {
  isDynamic : boolean;
  availabilityStartTime? : number;
  duration? : number;
  baseURL? : string;
}

/**
 * Avoid periods to overlap.
 *
 * According to DASH guidelines, if a period has media duration longer than
 * the distance between the start of this period and the start of the next period,
 * use of start times implies that the client will start the playout of the next
 * period at the time stated, rather than finishing the playout of the last period.
 *
 * Even if that case if defined when period last(s) segment(s) is/are a bit longer,
 * it can be meaningful when two periods are overlapping. We will always shorten
 * the first period, and even erase it if its duration is equal to zero.
 *
 * Example (Periods are numbered under their manifest order) :
 *
 * [ Period 1 ][ Period 2 ]       ------>  [ Period 1 ][ Period 3 ]
 *             [ Period 3 ]
 *
 * [ Period 1 ][ Period 2 ]       ------>  [ Period 1 ][  2  ][ Period 3 ]
 *                  [ Period 3 ]
 *
 * [ Period 1 ][ Period 2 ]       ------>  [  1  ][      Period 3     ]
 *        [      Period 3     ]
 *
 * @param {Array.<Object>} parsedPeriods
 * @return {Array.<Object>}
 */
function flattenOverlappingPeriods(parsedPeriods: IParsedPeriod[]): IParsedPeriod[] {
  return parsedPeriods.reduce((periods: IParsedPeriod[], parsedPeriod) => {
    for (let i = periods.length - 1; i >= 0; i--) {
      const period = periods[i];
      if (
        (period != null && period.duration != null) &&
        (period.start + period.duration) > parsedPeriod.start
      ) {
        log.warn("DASH: Updating overlapping Periods.", period, parsedPeriod);
        period.duration = parsedPeriod.start - period.start;
        period.end = parsedPeriod.start;
        if (period.duration <= 0) {
          periods.splice(i, 1);
        }
      }
    }
    periods.push(parsedPeriod);
    return periods;
  }, []);
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
      periodID = "gen-dash-period-" + generateNewId();
    } else {
      periodID = period.attributes.id;
    }

    // 3. Find the start of the Period (required)
    let periodStart : number;
    if (period.attributes.start != null) {
      periodStart = period.attributes.start;
    } else {
      if (i === 0) {
        periodStart = (
          !manifestInfos.isDynamic || manifestInfos.availabilityStartTime == null
        ) ?  0 : manifestInfos.availabilityStartTime;
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

    const adaptations = parseAdaptationSets(period.children.adaptations, {
      isDynamic: manifestInfos.isDynamic,
      start: periodStart,
      baseURL: periodBaseURL,
    });
    const parsedPeriod : IParsedPeriod = {
      id: periodID,
      start: periodStart,
      duration: periodDuration,
      adaptations,
    };
    if (period.attributes.bitstreamSwitching != null) {
      parsedPeriod.bitstreamSwitching = period.attributes.bitstreamSwitching;
    }
    parsedPeriods.push(parsedPeriod);
  }
  return flattenOverlappingPeriods(parsedPeriods);
}
