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

import getCueBlocks from "../get_cue_blocks";
import getStyleBlocks from "../get_style_blocks";
import parseCueBlock from "../parse_cue_block";
import { getFirstLineAfterHeader } from "../utils";
import createDefaultStyleElements from "./create_default_style_elements";
import parseStyleBlock, {
  IStyleElements
} from "./parse_style_block";
import toHTML, {
  IVTTHTMLCue
} from "./to_html";

export interface IVTTHTMLCue {
  start : number;
  end: number;
  element : HTMLElement;
}

/**
 * Parse WebVTT from text. Returns an array with:
 * - start : start of current cue, in seconds
 * - end : end of current cue, in seconds
 * - content : HTML formatted cue.
 *
 * Global style is parsed and applied to div element.
 * Specific style is parsed and applied to class element.
 *
 * @param {string} text
 * @param {Number} timeOffset
 * @return {Array.<Object>}
 * @throws Error - Throws if the given WebVTT string is invalid.
 */
export default function parseWebVTT(
  text : string,
  timeOffset : number
) : IVTTHTMLCue[] {
  const newLineChar = /\r\n|\n|\r/g;
  const linified = text.split(newLineChar);
  if (!linified.length) {
    return [];
  }

  const cuesArray : IVTTHTMLCue[] = [];
  const defaultStyleElements : IStyleElements = createDefaultStyleElements();
  if (!linified[0].match(/^WEBVTT( |\t|\n|\r|$)/)) {
    throw new Error("Can't parse WebVTT: Invalid File.");
  }

  const firstLineAfterHeader = getFirstLineAfterHeader(linified);
  const styleBlocks = getStyleBlocks(linified, firstLineAfterHeader);
  const cueBlocks = getCueBlocks(linified, firstLineAfterHeader);

  const styleElements = parseStyleBlock(styleBlocks, defaultStyleElements);

  for (let i = 0; i < cueBlocks.length; i++) {
    const cueObject = parseCueBlock(cueBlocks[i], timeOffset);

    if (cueObject != null) {
      const htmlCue = toHTML(cueObject, styleElements);
      cuesArray.push(htmlCue);
    }
  }
  return cuesArray;
}
