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

// srt to VTTCue parser, Done for fun.
// Heavily inspired from the WebVTT implementation

import { makeCue } from "../../../compat/index.js";
import parseTimestamp from "./parseTimestamp.js";

/**
 * Parse whole srt file into an array of cues, to be inserted in a video's
 * TrackElement.
 * @param {string}
 * @param {Number} timeOffset
 * @returns {Array.<VTTCue|TextTrackCue>}
 */
export default function parseSRTStringToVTTCues(srtStr, timeOffset) {
  // Even if srt only authorize CRLF, we will also take LF or CR as line
  // terminators for resilience
  const lines = srtStr.split(/\r\n|\n|\r/);

  const cueBlocks = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) {
      const startingI = i;
      i++;

      while (lines[i]) {
        i++;
      }
      cueBlocks.push(lines.slice(startingI, i));
    }
  }

  const cues = [];
  for (let i = 0; i < cueBlocks.length; i++) {
    const cue = parseCue(cueBlocks[i], timeOffset);
    if (cue) {
      cues.push(cue);
    }
  }
  return cues;
}

/**
 * Parse cue block into a cue.
 * @param {Array.<string>} cueLines
 * @param {Number} timeOffset
 * @returns {TextTrackCue|VTTCue|null}
 */
function parseCue(cueLines, timeOffset) {
  const [startString, endString] = cueLines[1].split(" --> ");
  const payloadLines = cueLines.slice(2, cueLines.length);
  if (!startString || !endString || !payloadLines.length) {
    return null;
  }

  const start = parseTimestamp(startString);
  const end = parseTimestamp(endString);
  if (start == null || end == null) {
    return null;
  }
  const payload = payloadLines.join("\n");
  return makeCue(start + timeOffset, end + timeOffset, payload);
}
