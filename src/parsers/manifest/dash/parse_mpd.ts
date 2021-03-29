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

import config from "../../../config";
import log from "../../../log";
import Manifest from "../../../manifest";
import arrayFind from "../../../utils/array_find";
import { normalizeBaseURL } from "../../../utils/resolve_url";
import { IParsedManifest } from "../types";
// eslint-disable-next-line max-len
import extractMinimumAvailabilityTimeOffset from "./extract_minimum_availability_time_offset";
import getClockOffset from "./get_clock_offset";
import getHTTPUTCTimingURL from "./get_http_utc-timing_url";
import getMinimumAndMaximumPosition from "./get_minimum_and_maximum_positions";
import {
  createMPDIntermediateRepresentation,
  IMPDIntermediateRepresentation,
} from "./node_parsers/MPD";
import {
  createPeriodIntermediateRepresentation,
  IPeriodIntermediateRepresentation,
} from "./node_parsers/Period";
import parseAvailabilityStartTime from "./parse_availability_start_time";
import parsePeriods, {
  IXLinkInfos,
} from "./parse_periods";
import resolveBaseURLs from "./resolve_base_urls";

const { DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0 } = config;

/** Possible options for `parseMPD`.  */
export interface IMPDParserArguments {
  /** Whether we should request new segments even if they are not yet finished. */
  aggressiveMode : boolean;
  /**
   * If set, offset to add to `performance.now()` to obtain the current server's
   * time.
   */
  externalClockOffset? : number;
  /** Time, in terms of `performance.now` at which this MPD was received. */
  manifestReceivedTime? : number;
  /** Default base time, in seconds. */
  referenceDateTime? : number;
  /**
   * The parser should take this Manifest - which is a previously parsed
   * Manifest for the same dynamic content - as a base to speed-up the parsing
   * process.
   * /!\ If unexpected differences exist between the two, there is a risk of
   * de-synchronization with what is actually on the server,
   * Use with moderation.
   */
  unsafelyBaseOnPreviousManifest : Manifest | null;
  /** URL of the manifest (post-redirection if one). */
  url? : string;
}

interface ILoadedResource { url? : string;
                            sendingTime? : number;
                            receivedTime? : number;
                            responseData : string; }

export type IParserResponse<T> = { type : "needs-ressources";
                                   value : { ressources : string[];
                                             continue : (
                                               loadedRessources : ILoadedResource[]
                                             ) => IParserResponse<T>; }; } |
                                 { type : "done";
                                   value : { parsed : T;
                                             warnings : Error[]; }; };

/**
 * @param {Element} root - The MPD root.
 * @param {Object} args
 * @returns {Object}
 */
export default function parseMPD(
  root : Element,
  args : IMPDParserArguments
) : IParserResponse<IParsedManifest> {
  // Transform whole MPD into a parsed JS object representation
  const [mpdIR,
         warnings] = createMPDIntermediateRepresentation(root);
  return loadExternalRessourcesAndParse(mpdIR, args, warnings);
}

/**
 * Checks if xlinks needs to be loaded before actually parsing the manifest.
 * @param {Object} mpdIR
 * @param {Object} args
 * @param {Array.<Object>} warnings
 * @returns {Object}
 */
function loadExternalRessourcesAndParse(
  mpdIR : IMPDIntermediateRepresentation,
  args : IMPDParserArguments,
  warnings : Error[],
  hasLoadedClock? : boolean
) : IParserResponse<IParsedManifest> {
  const { children: rootChildren,
          attributes: rootAttributes } = mpdIR;

  const xlinkInfos : IXLinkInfos = new WeakMap();
  if (args.externalClockOffset == null) {
    const isDynamic : boolean = rootAttributes.type === "dynamic";

    const directTiming = arrayFind(rootChildren.utcTimings, (utcTiming) => {
      return utcTiming.schemeIdUri === "urn:mpeg:dash:utc:direct:2014" &&
             utcTiming.value != null;
    });

    const clockOffsetFromDirectUTCTiming =
      directTiming != null &&
      directTiming.value != null ? getClockOffset(directTiming.value) :
                                   undefined;
    let clockOffset = clockOffsetFromDirectUTCTiming != null &&
                      !isNaN(clockOffsetFromDirectUTCTiming) ?
                        clockOffsetFromDirectUTCTiming :
                        undefined;

    if (clockOffset != null) {
      args.externalClockOffset = clockOffset;
    } else if (isDynamic && hasLoadedClock !== true) {
      const UTCTimingHTTPURL = getHTTPUTCTimingURL(mpdIR);
      if (UTCTimingHTTPURL != null && UTCTimingHTTPURL.length > 0) {
        // TODO fetch UTCTiming and XLinks at the same time
        return {
          type: "needs-ressources",
          value: {
            ressources: [UTCTimingHTTPURL],
            continue: function continueParsingMPD(loadedRessources : ILoadedResource[]) {
              if (loadedRessources.length !== 1) {
                throw new Error("DASH parser: wrong number of loaded ressources.");
              }
              clockOffset = getClockOffset(loadedRessources[0].responseData);
              args.externalClockOffset = clockOffset;
              return loadExternalRessourcesAndParse(mpdIR, args, warnings, true);
            },
          },
        };
      }
    }
  }

  const xlinksToLoad : Array<{ index : number; ressource : string }> = [];
  for (let i = 0; i < rootChildren.periods.length; i++) {
    const { xlinkHref, xlinkActuate } = rootChildren.periods[i].attributes;
    if (xlinkHref != null && xlinkActuate === "onLoad") {
      xlinksToLoad.push({ index: i, ressource: xlinkHref });
    }
  }

  if (xlinksToLoad.length === 0) {
    return parseCompleteIntermediateRepresentation(mpdIR, args, warnings, xlinkInfos);
  }

  return {
    type: "needs-ressources",
    value: {
      ressources: xlinksToLoad.map(({ ressource }) => ressource),
      continue: function continueParsingMPD(loadedRessources : ILoadedResource[]) {
        if (loadedRessources.length !== xlinksToLoad.length) {
          throw new Error("DASH parser: wrong number of loaded ressources.");
        }

        // Note: It is important to go from the last index to the first index in
        // the resulting array, as we will potentially add elements to the array
        for (let i = loadedRessources.length - 1; i >= 0; i--) {
          const index = xlinksToLoad[i].index;
          const { responseData: xlinkData,
                  receivedTime,
                  sendingTime,
                  url } = loadedRessources[i];
          const wrappedData = "<root>" + xlinkData + "</root>";
          const dataAsXML = new DOMParser().parseFromString(wrappedData, "text/xml");
          if (dataAsXML == null || dataAsXML.children.length === 0) {
            throw new Error("DASH parser: Invalid external ressources");
          }
          const periods = dataAsXML.children[0].children;
          const periodsIR : IPeriodIntermediateRepresentation[] = [];
          for (let j = 0; j < periods.length; j++) {
            if (periods[j].nodeType === Node.ELEMENT_NODE) {
              const [periodIR,
                     periodWarnings] = createPeriodIntermediateRepresentation(periods[j]);
              xlinkInfos.set(periodIR, { receivedTime, sendingTime, url });
              periodsIR.push(periodIR);
              if (periodWarnings.length > 0) {
                warnings.push(...periodWarnings);
              }
            }
          }

          // replace original "xlinked" periods by the real deal
          rootChildren.periods.splice(index, 1, ...periodsIR);
        }
        return loadExternalRessourcesAndParse(mpdIR, args, warnings);
      },
    },
  };
}

/**
 * Parse the MPD intermediate representation into a regular Manifest.
 * @param {Object} mpdIR
 * @param {Object} args
 * @param {Array.<Object>} warnings
 * @param {Object} xlinkInfos
 * @returns {Object}
 */
function parseCompleteIntermediateRepresentation(
  mpdIR : IMPDIntermediateRepresentation,
  args : IMPDParserArguments,
  warnings : Error[],
  xlinkInfos : IXLinkInfos
) : IParserResponse<IParsedManifest> {
  const { children: rootChildren,
          attributes: rootAttributes } = mpdIR;
  const isDynamic : boolean = rootAttributes.type === "dynamic";
  const baseURLs = resolveBaseURLs(args.url === undefined ?
                                     [] :
                                     [normalizeBaseURL(args.url)],
                                   rootChildren.baseURLs);
  const availabilityStartTime = parseAvailabilityStartTime(rootAttributes,
                                                           args.referenceDateTime);
  const timeShiftBufferDepth = rootAttributes.timeShiftBufferDepth;
  const { externalClockOffset: clockOffset,
          unsafelyBaseOnPreviousManifest } = args;
  const availabilityTimeOffset =
    extractMinimumAvailabilityTimeOffset(rootChildren.baseURLs);

  const manifestInfos = { aggressiveMode: args.aggressiveMode,
                          availabilityStartTime,
                          availabilityTimeOffset,
                          baseURLs,
                          clockOffset,
                          duration: rootAttributes.duration,
                          isDynamic,
                          receivedTime: args.manifestReceivedTime,
                          timeShiftBufferDepth,
                          unsafelyBaseOnPreviousManifest,
                          xlinkInfos };
  const parsedPeriods = parsePeriods(rootChildren.periods, manifestInfos);
  const mediaPresentationDuration = rootAttributes.duration;

  let lifetime : number | undefined;
  let minimumTime : number | undefined;
  let timeshiftDepth : number | null = null;
  let maximumTimeData : { isLinear : boolean; value : number; time : number };

  if (rootAttributes.minimumUpdatePeriod !== undefined &&
      rootAttributes.minimumUpdatePeriod >= 0)
  {
    lifetime = rootAttributes.minimumUpdatePeriod === 0 ?
      DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0 :
      rootAttributes.minimumUpdatePeriod;
  }

  const [contentStart, contentEnd] = getMinimumAndMaximumPosition(parsedPeriods);
  const now = performance.now();

  if (!isDynamic) {
    minimumTime = contentStart !== undefined            ? contentStart :
                  parsedPeriods[0]?.start !== undefined ? parsedPeriods[0].start :
                                                          0;
    let maximumTime : number | undefined;
    if (contentEnd !== undefined) {
      maximumTime = contentEnd;
    } else if (mediaPresentationDuration !== undefined) {
      maximumTime = mediaPresentationDuration;
    } else if (parsedPeriods[parsedPeriods.length - 1] !== undefined) {
      const lastPeriod = parsedPeriods[parsedPeriods.length - 1];
      maximumTime = lastPeriod.end ??
                    (lastPeriod.duration !== undefined ?
                      lastPeriod.start + lastPeriod.duration :
                      undefined);
    }

    maximumTimeData = { isLinear: false,
                        value: maximumTime ?? Infinity,
                        time: now };
  } else {
    minimumTime = contentStart;
    timeshiftDepth = timeShiftBufferDepth ?? null;
    let maximumTime : number;
    if (contentEnd !== undefined) {
      maximumTime = contentEnd;
    } else {
      const ast = availabilityStartTime ?? 0;
      const { externalClockOffset } = args;
      if (externalClockOffset === undefined) {
        log.warn("DASH Parser: use system clock to define maximum position");
        maximumTime = (Date.now() / 1000) - ast;
      } else {
        const serverTime = performance.now() + externalClockOffset;
        maximumTime = (serverTime / 1000) - ast;
      }
    }
    maximumTimeData = { isLinear: true,
                        value: maximumTime,
                        time: now };

    // if the minimum calculated time is even below the buffer depth, perhaps we
    // can go even lower in terms of depth
    if (timeshiftDepth !== null && minimumTime !== undefined &&
        maximumTime - minimumTime > timeshiftDepth)
    {
      timeshiftDepth = maximumTime - minimumTime;
    }
  }

  const parsedMPD : IParsedManifest = {
    availabilityStartTime,
    clockOffset: args.externalClockOffset,
    isDynamic,
    isLive: isDynamic,
    periods: parsedPeriods,
    publishTime: rootAttributes.publishTime,
    suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay,
    transportType: "dash",
    timeBounds: { absoluteMinimumTime: minimumTime,
                  timeshiftDepth,
                  maximumTimeData },
    lifetime,
    uris: args.url == null ?
      rootChildren.locations : [args.url, ...rootChildren.locations],
  };

  return { type: "done", value: { parsed: parsedMPD, warnings } };
}
