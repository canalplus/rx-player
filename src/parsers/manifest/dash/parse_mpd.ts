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

import arrayFind from "../../../utils/array_find";
import idGenerator from "../../../utils/id_generator";
import resolveURL, {
  normalizeBaseURL,
} from "../../../utils/resolve_url";
import { IParsedManifest } from "../types";
import checkManifestIDs from "../utils/check_manifest_ids";
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
import parseDuration from "./parse_duration";
import parsePeriods, {
  IXLinkInfos,
} from "./parse_periods";

const generateManifestID = idGenerator();

export interface IMPDParserArguments {
  aggressiveMode : boolean; // Whether we should request new segments even if
                            // they are not yet finished
  externalClockOffset? : number; // If set, offset to add to `performance.now()`
                                 // to obtain the current server's time
  manifestReceivedTime? : number; // Time, in terms of `performance.now` at
                                  // which this MPD was received.
  referenceDateTime? : number; // Default base time, in seconds
  url? : string; // URL of the manifest (post-redirection if one)
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
                                   value :  T; };
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
  const mpdIR = createMPDIntermediateRepresentation(root);
  return loadExternalRessourcesAndParse(mpdIR, args);
}

/**
 * Checks if xlinks needs to be loaded before actually parsing the manifest.
 * @param {Object} mpdIR
 * @param {Object} args
 * @returns {Object}
 */
function loadExternalRessourcesAndParse(
  mpdIR : IMPDIntermediateRepresentation,
  args : IMPDParserArguments,
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
              return loadExternalRessourcesAndParse(mpdIR, args, true);
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
    return parseCompleteIntermediateRepresentation(mpdIR, args, xlinkInfos);
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
          if (!dataAsXML || dataAsXML.children.length === 0) {
            throw new Error("DASH parser: Invalid external ressources");
          }
          const periods = dataAsXML.children[0].children;
          const periodsIR : IPeriodIntermediateRepresentation[] = [];
          for (let j = 0; j < periods.length; j++) {
            if (periods[j].nodeType === Node.ELEMENT_NODE) {
              const periodIR = createPeriodIntermediateRepresentation(periods[j]);
              xlinkInfos.set(periodIR, { receivedTime, sendingTime, url });
              periodsIR.push(periodIR);
            }
          }

          // replace original "xlinked" periods by the real deal
          rootChildren.periods.splice(index, 1, ...periodsIR);
        }
        return loadExternalRessourcesAndParse(mpdIR, args);
      },
    },
  };
}

/**
 * Parse the MPD intermediate representation into a regular Manifest.
 * @param {Object} mpdIR
 * @param {Object} args
 * @returns {Object}
 */
function parseCompleteIntermediateRepresentation(
  mpdIR : IMPDIntermediateRepresentation,
  args : IMPDParserArguments,
  xlinkInfos : IXLinkInfos
) : IParserResponse<IParsedManifest> {
  const { children: rootChildren,
          attributes: rootAttributes } = mpdIR;
  const isDynamic : boolean = rootAttributes.type === "dynamic";
  const baseURL = resolveURL(normalizeBaseURL(args.url == null ? "" :
                                                                 args.url),
                             rootChildren.baseURL);
  const availabilityStartTime = parseAvailabilityStartTime(rootAttributes,
                                                           args.referenceDateTime);
  const timeShiftBufferDepth = rootAttributes.timeShiftBufferDepth;
  const clockOffset = args.externalClockOffset;

  const manifestInfos = { aggressiveMode: args.aggressiveMode,
                          availabilityStartTime,
                          baseURL,
                          clockOffset,
                          duration: rootAttributes.duration,
                          isDynamic,
                          receivedTime: args.manifestReceivedTime,
                          timeShiftBufferDepth,
                          xlinkInfos };
  const parsedPeriods = parsePeriods(rootChildren.periods, manifestInfos);
  const duration = parseDuration(rootAttributes, parsedPeriods);
  const parsedMPD : IParsedManifest = {
    availabilityStartTime,
    baseURL,
    clockOffset: args.externalClockOffset,
    duration,
    id: rootAttributes.id != null ? rootAttributes.id :
                                    "gen-dash-manifest-" + generateManifestID(),
    isLive: isDynamic,
    periods: parsedPeriods,
    suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay,
    transportType: "dash",
    uris: args.url == null ?
      rootChildren.locations : [args.url, ...rootChildren.locations],
  };

  // -- add optional fields --
  if (rootAttributes.minimumUpdatePeriod != null
      && rootAttributes.minimumUpdatePeriod > 0)
  {
    parsedMPD.lifetime = rootAttributes.minimumUpdatePeriod;
  }

  checkManifestIDs(parsedMPD);
  const [minTime, maxTime] = getMinimumAndMaximumPosition(parsedMPD);
  const now = performance.now();
  if (!isDynamic) {
    if (minTime != null) {
      parsedMPD.minimumTime = { isContinuous: false,
                                value: minTime,
                                time: now };
    }
    if (duration != null) {
      parsedMPD.maximumTime = { isContinuous: false,
                                value: duration,
                                time: now };
    } else if (maxTime != null) {
      parsedMPD.maximumTime = { isContinuous: false,
                                value: maxTime,
                                time: now };
    }
  } else {
    if (minTime != null) {
      parsedMPD.minimumTime = { isContinuous: timeShiftBufferDepth != null,
                                value: minTime,
                                time: now };
    }
    if (maxTime != null) {
      parsedMPD.maximumTime = { isContinuous: true,
                                value: maxTime,
                                time: now };
      if (minTime == null) {
        parsedMPD.minimumTime = { isContinuous: true,
                                  value: maxTime,
                                  time: now };
      }
    }
  }

  return { type: "done", value: parsedMPD };
}
