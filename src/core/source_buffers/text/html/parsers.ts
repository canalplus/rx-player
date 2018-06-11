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

import features from "../../../../features";
import log from "../../../../utils/log";

export interface IHTMLCue {
  start : number;
  end: number;
  element : HTMLElement;
}

/**
 * @param {string} type
 * @param {string} data
 * @param {Number} timeOffset
 * @param {string} [language]
 * @returns {Array.<Object>}
 * @throws Error - Throw if no parser is found for the given type
 */
export default function parseTextTrackToElements(
  type : string,
  data : string,
  timeOffset : number,
  language? : string
) : IHTMLCue[] {
  log.debug("finding parser for html text tracks:", type);
  const parser = features.htmlTextTracksParsers[type];

  if (!parser) {
    throw new Error("no parser found for the given text track");
  }
  log.debug("parser found, parsing...");
  const parsed = parser(data, timeOffset, language);
  log.debug("parsed successfully!", parsed);
  return parsed;
}
