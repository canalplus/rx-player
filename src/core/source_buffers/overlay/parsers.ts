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

import { IMetaDashOverlayData  } from "../../../net/types";
import log from "../../../utils/log";

export interface IHTMLOverlay {
  start : number;
  end: number;
  element : HTMLElement;
}

type htmlParserFn = (
  overlay : IMetaDashOverlayData[],
  timeOffset : number
) => IHTMLOverlay[];

const htmlParsers : { [format : string] : htmlParserFn } = {};

/* tslint:disable no-var-requires */
// if (__FEATURES__.OVERLAY_METADASH) { // XXX TODO
  htmlParsers.metadash =
    require("../../../parsers/overlays/metadash.ts").default;
// }
/* tslint:enable no-var-requires */

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
  data : IMetaDashOverlayData[],
  timeOffset : number
) : IHTMLOverlay[] {
  log.debug("finding parser for overlay of type type:", type);
  const parser = htmlParsers[type];

  if (!parser) {
    throw new Error("no parser found for the given overlay type");
  }
  log.debug("parser found, parsing...");
  const parsed = parser(data, timeOffset);
  log.debug("parsed successfully!", parsed);
  return parsed;
}
