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

import parseMPD from "../../../parsers/manifest/dash/node_parsers";
import { parsePeriods } from "../../../parsers/manifest/dash/node_parsers/Period";
import {
  IParsedManifest,
  IParsedPeriod,
} from "../types";

/**
 * Parse periods from text.
 * @param {String} str
 * @param {Object} prevPeriodInfos
 * @param {Object} nextPeriodInfos
 * @returns {Object} - parsed periods
 */
export function dashPeriodParser(
  data: string,
  prevPeriodInfos: { start?: number; duration?: number }|undefined,
  nextPeriodInfos: { start?: number }|undefined
): IParsedPeriod[] {
  const domParser = new DOMParser();
  const textWithRoot = "<root>" + data + "</root>";
  const document = domParser.parseFromString(textWithRoot, "text/xml");
  return parsePeriods(document, prevPeriodInfos, nextPeriodInfos);
}

/**
 * @param {Document} manifest - Original manifest as returned by the server
 * @param {string} uri
 * @returns {Object} - parsed manifest
 */
export default function dashManifestParser(
  document: Document,
  uri : string
) : IParsedManifest {
  const root = document.documentElement;
  if (!root || root.nodeName !== "MPD") {
    throw new Error("document root should be MPD");
  }
  return parseMPD(root, uri);
}
