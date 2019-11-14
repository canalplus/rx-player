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
import parseStyleBlocks from "./parse_style_block";
import toHTML, {
  IVTTHTMLCue
} from "./to_html";

/**
 * Parse WebVTT from text. Returns an array with:
 * - start : start of current cue, in seconds
 * - end : end of current cue, in seconds
 * - content : HTML formatted cue.
 *
 * Global style is parsed and applied to div element.
 * Specific style is parsed and applied to class element.
 *
 * @throws Error - Throws if the given WebVTT string is invalid.
 * @param {string} text - The whole webvtt subtitles to parse
 * @param {Number} timeOffset - Offset to add to start and end times, in seconds
 * @return {Array.<Object>}
 */
export default function parseWebVTT(
  text : string,
  timeOffset : number
) : IVTTHTMLCue[] {
  const newLineChar = /\r\n|\n|\r/g; // CRLF|LF|CR
  const linified = text.split(newLineChar);

  const cuesArray : IVTTHTMLCue[] = [];
  if (linified[0].match(/^WEBVTT( |\t|\n|\r|$)/) === null) {
    throw new Error("Can't parse WebVTT: Invalid File.");
  }

  const firstLineAfterHeader = getFirstLineAfterHeader(linified);
  const styleBlocks = getStyleBlocks(linified, firstLineAfterHeader);
  const cueBlocks = getCueBlocks(linified, firstLineAfterHeader);

  const styles = parseStyleBlocks(styleBlocks);

  for (let i = 0; i < cueBlocks.length; i++) {
    const cueObject = parseCueBlock(cueBlocks[i], timeOffset);

    if (cueObject != null) {
      const htmlCue = toHTML(cueObject, styles);
      cuesArray.push(htmlCue);
    }
  }
  return cuesArray;
}
