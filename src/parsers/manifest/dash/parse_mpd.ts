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
import idGenerator from "../../../utils/id_generator";
import resolveURL, {
  normalizeBaseURL,
} from "../../../utils/resolve_url";
import { IParsedManifest } from "../types";
import checkManifestIDs from "../utils/check_manifest_ids";
import getTimeLimits from "./get_presentation_live_gap";
import {
  createMPDIntermediateRepresentation,
  IMPDIntermediateRepresentation,
} from "./node_parsers/MPD";
import {
  createPeriodIntermediateRepresentation,
  IPeriodIntermediateRepresentation,
} from "./node_parsers/Period";
import parsePeriods from "./parse_periods";

const generateManifestID = idGenerator();

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
 * @param {string} url - The url where the MPD is located
 * @returns {Object}
 */
export default function parseMPD(
  root : Element,
  uri : string
) : IParserResponse<IParsedManifest> {
  // Transform whole MPD into a parsed JS object representation
  const mpdIR = createMPDIntermediateRepresentation(root);
  return loadExternalRessourcesAndParse(mpdIR, uri);
}

/**
 * Checks if xlinks needs to be loaded before actually parsing the manifest.
 * @param {Object} mpdIR
 * @param {string} uri
 * @returns {Object}
 */
function loadExternalRessourcesAndParse(
  mpdIR : IMPDIntermediateRepresentation,
  uri : string
) : IParserResponse<IParsedManifest> {
  const xlinksToLoad : Array<{ index : number; ressource : string }> = [];
  for (let i = 0; i < mpdIR.children.periods.length; i++) {
    const { xlinkHref, xlinkActuate } = mpdIR.children.periods[i].attributes;
    if (xlinkHref != null && xlinkActuate === "onLoad") {
      xlinksToLoad.push({ index: i, ressource: xlinkHref });
    }
  }

  if (xlinksToLoad.length === 0) {
    const parsedManifest = parseCompleteIntermediateRepresentation(mpdIR, uri);
    return { type: "done", value: parsedManifest };
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
        return loadExternalRessourcesAndParse(mpdIR, uri);
      },
    },
  };
}

/**
 * Parse the MPD intermediate representation into a regular Manifest.
 * @param {Object} mpdIR
 * @param {string} uri
 * @returns {Object}
 */
function parseCompleteIntermediateRepresentation(
  mpdIR : IMPDIntermediateRepresentation,
  uri : string
) : IParsedManifest {
  const {
    children: rootChildren,
    attributes: rootAttributes,
  } = mpdIR;

  const baseURL = resolveURL(normalizeBaseURL(uri), rootChildren.baseURL);

  const isDynamic : boolean = rootAttributes.type === "dynamic";
  const availabilityStartTime = (
    rootAttributes.type === "static" ||
    rootAttributes.availabilityStartTime == null
  ) ?  0 : rootAttributes.availabilityStartTime;

  const parsedPeriods = parsePeriods(rootChildren.periods, {
    availabilityStartTime,
    duration: rootAttributes.duration,
    isDynamic,
    baseURL,
  });

  if (parsedPeriods.length === 0) {
    throw new Error("DASH Parser: no period declared in the MPD.");
  }

  const duration : number|undefined = (() => {
    if (rootAttributes.duration != null) {
      return rootAttributes.duration;
    }
    if (isDynamic) {
      return undefined;
    }
    if (parsedPeriods.length) {
      const lastPeriod = parsedPeriods[parsedPeriods.length - 1];
      if (lastPeriod.end != null) {
        return lastPeriod.end;
      } else if (lastPeriod.duration != null) {
        return lastPeriod.start + lastPeriod.duration;
      }
    }
    return undefined;
  })();

  const parsedMPD : IParsedManifest = {
    availabilityStartTime,
    baseURL,
    duration,
    id: rootAttributes.id != null ?
      rootAttributes.id : "gen-dash-manifest-" + generateManifestID(),
    periods: parsedPeriods,
    transportType: "dash",
    isLive: isDynamic,
    uris: [uri, ...rootChildren.locations],
    suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay != null ?
      rootAttributes.suggestedPresentationDelay :
      config.DEFAULT_SUGGESTED_PRESENTATION_DELAY.DASH,
  };

  // -- add optional fields --
  if (parsedMPD.isLive) {
    const [minimumTime, maximumTime] =
      getTimeLimits(parsedMPD, rootAttributes.timeShiftBufferDepth);
    parsedMPD.minimumTime = minimumTime;
    parsedMPD.maximumTime = maximumTime;
  }
  if (rootAttributes.minimumUpdatePeriod != null
      && rootAttributes.minimumUpdatePeriod > 0) {
    parsedMPD.lifetime = rootAttributes.minimumUpdatePeriod;
  }

  checkManifestIDs(parsedMPD);
  return parsedMPD;
}
