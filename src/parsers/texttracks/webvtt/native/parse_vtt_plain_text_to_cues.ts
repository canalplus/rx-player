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

/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */

import type { ICompatVTTCue } from "../../../../compat/browser_compatibility_types";
import isVTTCue from "../../../../compat/is_vtt_cue";
import bufferSourceToUint8 from "../../../../utils/buffer_source_to_uint8";
import { utf8ToStr } from "../../../../utils/string_parsing";
import getCueBlocks from "../get_cue_blocks";
import getStyleBlocks from "../get_style_blocks";
import parseCueBlock from "../parse_cue_block";
import parseStyleBlocks from "../parse_style_block";
import { getFirstLineAfterHeader } from "../utils";
import setSettingsOnCue from "./set_settings_on_cue";
import toNativeCue from "./to_native_cue";

// Simple VTT to ICompatVTTCue parser:
// Just parse cues and associated settings.
// Does not take into consideration STYLE and REGION blocks.

/**
 * Parse whole WEBVTT file into an array of cues, to be inserted in a video's
 * TrackElement.
 * @param {string|BufferSource} input
 * @param {Number} _timescale
 * @param {Number} timeOffset
 * @returns {Array.<ICompatVTTCue|TextTrackCue>}
 */
export default function parseWebVTTPlainTextToVTTCues(
  input: string | BufferSource,
  _timescale: number,
  timeOffset: number,
): Array<TextTrackCue | ICompatVTTCue> {
  let vttStr: string;
  if (typeof input === "string") {
    vttStr = input;
  } else {
    // Assume UTF-8
    vttStr = utf8ToStr(bufferSourceToUint8(input));
  }
  // WEBVTT authorize CRLF, LF or CR as line terminators
  const lines = vttStr.split(/\r\n|\n|\r/);

  if (!/^WEBVTT($| |\t)/.test(lines[0])) {
    throw new Error("Can't parse WebVTT: Invalid file.");
  }

  const firstLineAfterHeader = getFirstLineAfterHeader(lines);
  const cueBlocks: string[][] = getCueBlocks(lines, firstLineAfterHeader);
  const styleBlocks = getStyleBlocks(lines, firstLineAfterHeader);
  const styles = parseStyleBlocks(styleBlocks);
  const cues: Array<ICompatVTTCue | TextTrackCue> = [];
  for (const cueBlock of cueBlocks) {
    const cueObject = parseCueBlock(cueBlock, timeOffset);
    if (cueObject !== null) {
      const nativeCue = toNativeCue(cueObject, styles);
      if (nativeCue !== null) {
        if (isVTTCue(nativeCue)) {
          setSettingsOnCue(cueObject.settings, nativeCue);
        }
        cues.push(nativeCue);
      }
    }
  }
  return cues;
}
