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

import type { ICompatVTTCue } from "../../../../compat/browser_compatibility_types.ts";
import bufferSourceToUint8 from "../../../../utils/buffer_source_to_uint8.ts";
import { utf8ToStr } from "../../../../utils/string_parsing.ts";
import parseTtml from "../parse_ttml.ts";
import parseCue from "./parse_cue.ts";

/**
 * @param {string|BufferSource} input
 * @param {Object} _context
 * @param {number} timeOffset
 * @returns {Array.<VTTCue|TextTrackCue>}
 */
export default function parseTtmlToNative(
  input: string | BufferSource,
  _context: unknown,
  timeOffset: number,
): Array<TextTrackCue | ICompatVTTCue> {
  let str: string;
  if (typeof input !== "string") {
    // Assume UTF-8
    // TODO: detection?
    str = utf8ToStr(bufferSourceToUint8(input));
  } else {
    str = input;
  }
  const parsedCues = parseTtml(str, timeOffset);
  const cues: Array<TextTrackCue | ICompatVTTCue> = [];
  for (const parsedCue of parsedCues) {
    const cue = parseCue(parsedCue);
    if (cue !== null) {
      cues.push(cue);
    }
  }
  return cues;
}
