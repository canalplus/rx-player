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

import log from "../../../../log";
import Manifest from "../../../../manifest";
import flatMap from "../../../../utils/flat_map";
import idGenerator from "../../../../utils/id_generator";
import objectValues from "../../../../utils/object_values";
import { utf8ToStr } from "../../../../utils/string_parsing";
import {
  IManifestStreamEvent,
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedPeriod,
} from "../../types";
import {
  IEventStreamIntermediateRepresentation,
  IPeriodIntermediateRepresentation,
} from "../node_parser_types";
// eslint-disable-next-line max-len
import flattenOverlappingPeriods from "./flatten_overlapping_periods";
import getPeriodsTimeInformation from "./get_periods_time_infos";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import parseAdaptationSets, {
  IAdaptationSetContext,
} from "./parse_adaptation_sets";
import resolveBaseURLs from "./resolve_base_urls";

const generatePeriodID = idGenerator();

/** Information about each linked Xlink. */
export type IXLinkInfos = WeakMap<IPeriodIntermediateRepresentation, {
  /** Real URL (post-redirection) used to download this xlink. */
  url? : string | undefined;
  /** Time at which the request was sent (since the time origin), in ms. */
  sendingTime? : number | undefined;
  /** Time at which the request was received (since the time origin), in ms. */
  receivedTime? : number | undefined;
}>;

/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} context
 * @returns {Array.<Object>}
 */
export default function parsePeriods(
  periodsIR : IPeriodIntermediateRepresentation[],
  context : IPeriodContext
): IParsedPeriod[] {
  const parsedPeriods : IParsedPeriod[] = [];
  const periodsTimeInformation = getPeriodsTimeInformation(periodsIR, context);
  if (periodsTimeInformation.length !== periodsIR.length) {
    throw new Error("MPD parsing error: the time information are incoherent.");
  }

  const { isDynamic,
          timeShiftBufferDepth } = context;
  const manifestBoundsCalculator = new ManifestBoundsCalculator({ isDynamic,
                                                                  timeShiftBufferDepth });

  if (!isDynamic && context.duration != null) {
    manifestBoundsCalculator.setLastPosition(context.duration);
  }

  // We parse it in reverse because we might need to deduce the buffer depth from
  // the last Periods' indexes
  for (let i = periodsIR.length - 1; i >= 0; i--) {
    const isLastPeriod = i === periodsIR.length - 1;
    const periodIR = periodsIR[i];
    const xlinkInfos = context.xlinkInfos.get(periodIR);
    const periodBaseURLs = resolveBaseURLs(context.baseURLs,
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
                                                    context.receivedTime;

    const unsafelyBaseOnPreviousPeriod = context
      .unsafelyBaseOnPreviousManifest?.getPeriod(periodID) ?? null;

    const availabilityTimeComplete = periodIR.attributes.availabilityTimeComplete ?? true;
    const availabilityTimeOffset = periodIR.attributes.availabilityTimeOffset ?? 0;
    const { manifestProfiles } = context;
    const { segmentTemplate } = periodIR.children;
    const adapCtxt : IAdaptationSetContext = { availabilityTimeComplete,
                                               availabilityTimeOffset,
                                               baseURLs: periodBaseURLs,
                                               manifestBoundsCalculator,
                                               end: periodEnd,
                                               isDynamic,
                                               isLastPeriod,
                                               manifestProfiles,
                                               receivedTime,
                                               segmentTemplate,
                                               start: periodStart,
                                               timeShiftBufferDepth,
                                               unsafelyBaseOnPreviousPeriod };
    const adaptations = parseAdaptationSets(periodIR.children.adaptations, adapCtxt);

    const namespaces = (context.xmlNamespaces ?? [])
      .concat(periodIR.attributes.namespaces ?? []);
    const streamEvents = generateStreamEvents(periodIR.children.eventStreams,
                                              periodStart,
                                              namespaces);
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
            guessLastPositionFromClock(context, periodStart);
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

  if (context.isDynamic && !manifestBoundsCalculator.lastPositionIsKnown()) {
    // Guess a last time the last position
    const guessedLastPositionFromClock = guessLastPositionFromClock(context, 0);
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
 * @param {Object} context
 * @param {number} minimumTime
 * @returns {Array.<number|undefined>}
 */
function guessLastPositionFromClock(
  context : IPeriodContext,
  minimumTime : number
) : [number, number] | undefined {
  if (context.clockOffset != null) {
    const lastPosition = context.clockOffset / 1000 -
      context.availabilityStartTime;
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
      const lastPosition = now - context.availabilityStartTime;
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
  for (const adaptation of allAdaptations) {
    const representations = adaptation.representations;
    for (const representation of representations) {
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

/**
 * Generate parsed "eventStream" objects from a `StreamEvent` node's
 * intermediate Representation.
 * @param {Array.<Object>} baseIr - The array of every encountered StreamEvent's
 * intermediate representations for a given Period.
 * @param {number} periodStart - The time in seconds at which this corresponding
 * Period starts.
 * @returns {Array.<Object>} - The parsed objects.
 */
function generateStreamEvents(
  baseIr : IEventStreamIntermediateRepresentation[],
  periodStart : number,
  xmlNamespaces : Array<{ key : string; value : string }>
) : IManifestStreamEvent[] {
  const res : IManifestStreamEvent[] = [];
  for (const eventStreamIr of baseIr) {
    const { schemeIdUri = "",
            timescale = 1 } = eventStreamIr.attributes;
    const allNamespaces = xmlNamespaces
      .concat(eventStreamIr.attributes.namespaces ?? []);

    for (const eventIr of eventStreamIr.children.events) {
      if (eventIr.eventStreamData !== undefined) {
        const start = ((eventIr.presentationTime ?? 0) / timescale) + periodStart;
        const end = eventIr.duration === undefined ?
          undefined :
          start + (eventIr.duration / timescale);

        let element;
        if (eventIr.eventStreamData instanceof Element) {
          element = eventIr.eventStreamData;
        } else {
          // First, we will create a parent Element defining all namespaces that
          // should have been encountered until know.
          // This is needed because the DOMParser API might throw when
          // encountering unknown namespaced attributes or elements in the given
          // `<Event>` xml subset.
          let parentNode = allNamespaces.reduce((acc, ns) => {
            return acc + "xmlns:" + ns.key + "=\"" + ns.value + "\" ";
          }, "<toremove ");
          parentNode += ">";

          const elementToString = utf8ToStr(new Uint8Array(eventIr.eventStreamData));
          element = new DOMParser()
            .parseFromString(parentNode + elementToString + "</toremove>",
                             "application/xml")
            .documentElement
            .childNodes[0] as Element; // unwrap from the `<toremove>` element
        }
        res.push({ start,
                   end,
                   id: eventIr.id,
                   data: { type: "dash-event-stream",
                           value: { schemeIdUri,
                                    timescale,
                                    element } } });
      }
    }
  }
  return res;
}

/** Context needed when calling `parsePeriods`. */
export interface IPeriodContext extends IInheritedAdaptationContext {
  availabilityStartTime : number;
  clockOffset? : number | undefined;
  /** Duration (mediaPresentationDuration) of the whole MPD, in seconds. */
  duration? : number | undefined;
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

  /**
   * XML namespaces linked to the `<MPD>` element.
   * May be needed to convert EventStream's Event elements back into the
   * Document form.
   */
  xmlNamespaces? : Array<{ key : string;
                           value : string; }> | undefined;
}

type IInheritedAdaptationContext = Omit<IAdaptationSetContext,
                                        "availabilityTimeComplete" |
                                        "availabilityTimeOffset" |
                                        "duration" |
                                        "isLastPeriod" |
                                        "manifestBoundsCalculator" |
                                        "start" |
                                        "unsafelyBaseOnPreviousPeriod">;
