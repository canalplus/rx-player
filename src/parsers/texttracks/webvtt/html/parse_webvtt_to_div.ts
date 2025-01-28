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

import bufferSourceToUint8 from "../../../../utils/buffer_source_to_uint8";
import { strToUtf8, utf8ToStr } from "../../../../utils/string_parsing";
import getCueBlocks from "../get_cue_blocks";
import getStyleBlocks from "../get_style_blocks";
import parseCueBlock from "../parse_cue_block";
import parseMp4EmbeddedWebVtt from "../parse_mp4_embedded_wvtt";
import parseStyleBlocks from "../parse_style_block";
import seemsMp4EmbeddedFormat from "../seems_mp4_embedded_format";
import { getFirstLineAfterHeader } from "../utils";
import type { IVTTHTMLCue } from "./to_html";
import toHTML from "./to_html";

/**
 * Parse WebVTT subtitles format.
 * @throws Error - Throws if the given WebVTT format.
 * @param {string | BufferSource} text - The whole webvtt subtitles to parse
 * @param {Number} timescale
 * @param {Number} timeOffset - Offset to add to start and end times, in seconds
 * @return {Array.<Object>}
 */
export default function parseWebVttToDiv(
  text: string | BufferSource,
  timescale: number,
  timeOffset: number,
): IVTTHTMLCue[] {
  if (seemsMp4EmbeddedFormat(text)) {
    if (typeof text === "string") {
      return parseMp4EmbeddedWebVtt(strToUtf8(text), timescale, timeOffset, toHTML);
    } else {
      return parseMp4EmbeddedWebVtt(
        bufferSourceToUint8(text),
        timescale,
        timeOffset,
        toHTML,
      );
    }
  } else if (typeof text === "string") {
    return parseWebVTTText(text, timescale, timeOffset);
  } else {
    return parseWebVTTText(
      // Assume UTF-8
      utf8ToStr(bufferSourceToUint8(text)),
      timescale,
      timeOffset,
    );
  }
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
 * @throws Error - Throws if the given WebVTT string is invalid.
 * @param {string } textStr - The whole webvtt subtitles to parse
 * @param {Number} _timescale
 * @param {Number} timeOffset - Offset to add to start and end times, in seconds
 * @return {Array.<Object>}
 */
function parseWebVTTText(
  textStr: string,
  _timescale: number,
  timeOffset: number,
): IVTTHTMLCue[] {
  const newLineChar = /\r\n|\n|\r/g; // CRLF|LF|CR
  const linified = textStr.split(newLineChar);

  const cuesArray: IVTTHTMLCue[] = [];
  if (/^WEBVTT( |\t|\n|\r|$)/.exec(linified[0]) === null) {
    throw new Error("Can't parse WebVTT: Invalid File.");
  }

  const firstLineAfterHeader = getFirstLineAfterHeader(linified);
  const styleBlocks = getStyleBlocks(linified, firstLineAfterHeader);
  const cueBlocks = getCueBlocks(linified, firstLineAfterHeader);

  const styles = parseStyleBlocks(styleBlocks);

  for (let i = 0; i < cueBlocks.length; i++) {
    const cueObject = parseCueBlock(cueBlocks[i], timeOffset);

    if (cueObject !== null) {
      const htmlCue = toHTML(cueObject, styles);
      cuesArray.push(htmlCue);
    }
  }
  return cuesArray;
}
