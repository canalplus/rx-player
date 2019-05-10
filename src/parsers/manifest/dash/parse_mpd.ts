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
import arrayFind from "../../../utils/array_find";
import idGenerator from "../../../utils/id_generator";
import resolveURL, {
  normalizeBaseURL,
} from "../../../utils/resolve_url";
import { IParsedManifest } from "../types";
import checkManifestIDs from "../utils/check_manifest_ids";
import getClockOffset from "./get_clock_offset";
import getHTTPUTCTimingURL from "./get_http_utc-timing_url";
import getLastTimeReference from "./get_last_time_reference";
import getPresentationLiveGap from "./get_presentation_live_gap";
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
import parsePeriods from "./parse_periods";

const generateManifestID = idGenerator();

export interface IMPDParserArguments {
  url : string; // URL of the manifest (post-redirection if one)
  referenceDateTime? : number; // Default base time, in seconds
  loadExternalClock: boolean; // If true, we might need to synchronize the clock
}

export type IParserResponse<T> =
  {
    type : "needs-ressources";
    value : {
      ressources : string[];
      continue : (loadedRessources : string[]) => IParserResponse<T>;
    };
  } |
  {
    type : "done";
    value : T;
  };

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
  args : IMPDParserArguments
) : IParserResponse<IParsedManifest> {
  const xlinksToLoad : Array<{ index : number; ressource : string }> = [];
  for (let i = 0; i < mpdIR.children.periods.length; i++) {
    const { xlinkHref, xlinkActuate } = mpdIR.children.periods[i].attributes;
    if (xlinkHref != null && xlinkActuate === "onLoad") {
      xlinksToLoad.push({ index: i, ressource: xlinkHref });
    }
  }

  if (xlinksToLoad.length === 0) {
    return parseCompleteIntermediateRepresentation(mpdIR, args);
  }

  return {
    type: "needs-ressources",
    value: {
      ressources: xlinksToLoad.map(({ ressource }) => ressource),
      continue: function continueParsingMPD(loadedRessources : string[]) {
        if (loadedRessources.length !== xlinksToLoad.length) {
          throw new Error("DASH parser: wrong number of loaded ressources.");
        }

        // Note: It is important to go from the last index to the first index in
        // the resulting array, as we will potentially add elements to the array
        for (let i = loadedRessources.length - 1; i >= 0; i--) {
          const index = xlinksToLoad[i].index;
          const xlinkData = loadedRessources[i];
          const wrappedData = "<root>" + xlinkData + "</root>";
          const dataAsXML = new DOMParser().parseFromString(wrappedData, "text/xml");
          if (!dataAsXML || dataAsXML.children.length === 0) {
            throw new Error("DASH parser: Invalid external ressources");
          }
          const periods = dataAsXML.children[0].children;
          const periodsIR : IPeriodIntermediateRepresentation[] = [];
          for (let j = 0; j < periods.length; j++) {
            if (periods[j].nodeType === Node.ELEMENT_NODE) {
              periodsIR.push(createPeriodIntermediateRepresentation(periods[j]));
            }
          }

          // replace original "xlinked" periods by the real deal
          mpdIR.children.periods.splice(index, 1, ...periodsIR);
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
  args : IMPDParserArguments
) : IParserResponse<IParsedManifest> {
  const {
    children: rootChildren,
    attributes: rootAttributes,
  } = mpdIR;

  const baseURL = resolveURL(normalizeBaseURL(args.url), rootChildren.baseURL);

  const availabilityStartTime =
    parseAvailabilityStartTime(rootAttributes, args.referenceDateTime);

  const isDynamic : boolean = rootAttributes.type === "dynamic";
  const parsedPeriods = parsePeriods(rootChildren.periods, {
    availabilityStartTime,
    duration: rootAttributes.duration,
    isDynamic,
    baseURL,
  });

  const duration : number|undefined = parseDuration(rootAttributes, parsedPeriods);

  const directTiming = arrayFind(rootChildren.utcTimings,
    (utcTiming) =>
      utcTiming.schemeIdUri === "urn:mpeg:dash:utc:direct:2014" &&
      utcTiming.value != null
  );

  // second condition not needed but TS did not help there, even with a `is`
  const directClockOffset = directTiming != null && directTiming.value != null ?
    Date.now() - Date.parse(directTiming.value) : undefined;

  const parsedMPD : IParsedManifest = {
    availabilityStartTime,
    baseURL,
    duration,
    id: rootAttributes.id != null ?
      rootAttributes.id : "gen-dash-manifest-" + generateManifestID(),
    periods: parsedPeriods,
    transportType: "dash",
    isLive: isDynamic,
    uris: [args.url, ...rootChildren.locations],
    suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay != null ?
      rootAttributes.suggestedPresentationDelay :
      config.DEFAULT_SUGGESTED_PRESENTATION_DELAY.DASH,
    clockOffset: directClockOffset != null && !isNaN(directClockOffset) ?
      directClockOffset : undefined,
  };

  // -- add optional fields --

  if (rootAttributes.type !== "static" && rootAttributes.availabilityEndTime != null) {
    parsedMPD.availabilityEndTime = rootAttributes.availabilityEndTime;
  }
  if (rootAttributes.timeShiftBufferDepth != null) {
    parsedMPD.timeShiftBufferDepth = rootAttributes.timeShiftBufferDepth;
  }
  if (rootAttributes.minimumUpdatePeriod != null
      && rootAttributes.minimumUpdatePeriod > 0) {
    parsedMPD.lifetime = rootAttributes.minimumUpdatePeriod;
  }

  checkManifestIDs(parsedMPD);
  if (parsedMPD.isLive) {
    const lastTimeReference = getLastTimeReference(parsedMPD);
    if (
      directClockOffset == null && lastTimeReference == null &&
      args.loadExternalClock
    ) {
      const UTCTimingHTTPURL = getHTTPUTCTimingURL(mpdIR);
      if (UTCTimingHTTPURL != null && UTCTimingHTTPURL.length > 0) {
        return {
          type: "needs-ressources",
          value: {
            ressources: [UTCTimingHTTPURL],
            continue: function continueParsingMPD(loadedRessources : string[]) {
              if (loadedRessources.length !== 1) {
                throw new Error("DASH parser: wrong number of loaded ressources.");
              }
              parsedMPD.clockOffset = getClockOffset(loadedRessources[0]);
              parsedMPD.presentationLiveGap =
                getPresentationLiveGap(parsedMPD, lastTimeReference);
              return { type: "done", value: parsedMPD };
            },
          },
        };
      }
    }
    parsedMPD.presentationLiveGap = getPresentationLiveGap(parsedMPD, lastTimeReference);
  }

  return { type: "done", value: parsedMPD };
}
