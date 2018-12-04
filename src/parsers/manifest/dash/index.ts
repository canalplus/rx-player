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

import {
  IParsedManifest,
  IParsedPeriod,
} from "../types";
import {
  createPeriodIntermediateRepresentation,
  IPeriodIntermediateRepresentation,
} from "./node_parsers/Period";
import parseMPD from "./parseMPD";
import parsePeriods, {
  IManifestInfos,
} from "./parsePeriods";

/**
 * @param {Document} manifest - Original manifest as returned by the server
 * @param {string} uri
 * @returns {Object} - parsed manifest
 */
export default function parseFromDocument(
  document: Document,
  uri : string
) : IParsedManifest {
  const root = document.documentElement;
  if (!root || root.nodeName !== "MPD") {
    throw new Error("DASH Parser: document root should be MPD");
  }
  return parseMPD(root, uri);
}

/**
 * Parse Xlinks response as an array of Periods.
 * @param {string} xlinkData
 * @param {Object} manifestInfos
 * @returns {Array.<Object>}
 */
export function parseDownloadedXLinks(
  xlinkData : string,
  manifestInfos : IManifestInfos
) : IParsedPeriod[] {
  const wrappedData = "<root>" + xlinkData + "</root>";
  const dataAsXML = new DOMParser().parseFromString(wrappedData, "text/xml");
  const periods = dataAsXML.children;
  const periodsIR : IPeriodIntermediateRepresentation[] = [];
  for (let i = 0; i < periods.length; i++) {
    if (periods[i].nodeType === Node.ELEMENT_NODE) {
      const period = periods[i];
      periodsIR.push(createPeriodIntermediateRepresentation(period));
    }
  }
  return parsePeriods(periodsIR, manifestInfos);
}

export { IManifestInfos };
