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

import { IParsedManifest } from "../types";
import parseMPD, {
  IParseOptions,
  IParserResponse,
} from "./parse_mpd";

export type IMPDParserResponse = IParserResponse<IParsedManifest>;

/**
 * @param {Document} manifest - Original manifest as returned by the server
 * @param {string} uri
 * @param {Object} options - Parse options
 * @returns {Object} - parsed manifest
 */
export default function parseFromDocument(
  document: Document,
  uri : string,
  options? : IParseOptions
) : IMPDParserResponse {
  const root = document.documentElement;
  if (!root || root.nodeName !== "MPD") {
    throw new Error("DASH Parser: document root should be MPD");
  }
  return parseMPD(root, uri, options);
}
