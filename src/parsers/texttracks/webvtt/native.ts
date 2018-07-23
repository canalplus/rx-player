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

import { makeCue } from "../../../compat/index";
import arrayIncludes from "../../../utils/array-includes";
import getCueBlocks from "./getCueBlocks";
import parseCueBlock from "./parseCueBlock";
import { getFirstLineAfterHeader } from "./utils";

// Simple VTT to VTTCue parser:
// Just parse cues and associated settings.
// Does not take into consideration STYLE and REGION blocks.

/**
 * Parse whole WEBVTT file into an array of cues, to be inserted in a video's
 * TrackElement.
 * @param {string} vttStr
 * @param {Number} timeOffset
 * @returns {Array.<VTTCue|TextTrackCue>}
 */
export default function parseVTTStringToVTTCues(
  vttStr : string,
  timeOffset : number
) : Array<TextTrackCue|VTTCue> {
  // WEBVTT authorize CRLF, LF or CR as line terminators
  const lines = vttStr.split(/\r\n|\n|\r/);

  if (!(/^WEBVTT($| |\t)/.test(lines[0]))) {
    throw new Error("Can't parse WebVTT: Invalid file.");
  }

  const firstLineAfterHeader = getFirstLineAfterHeader(lines);
  const cueBlocks : string[][] = getCueBlocks(lines, firstLineAfterHeader);
  const cues : Array<VTTCue|TextTrackCue> = [];
  for (let i = 0; i < cueBlocks.length; i++) {
    const cueObject = parseCueBlock(cueBlocks[i], timeOffset);
    if (cueObject != null) {
      const nativeCue = toNativeCue(cueObject);
      if (nativeCue != null) {
        if (nativeCue instanceof VTTCue) {
          setSettingsOnCue(cueObject.settings, nativeCue);
        }
        cues.push(nativeCue);
      }
    }
  }
  return cues;
}

/**
 * @param {Object} cue Object
 * @returns {TextTrackCue|VTTCue|null}
 */
function toNativeCue(cueObj : {
  start : number;
  end : number;
  payload : string[];
}) : VTTCue|TextTrackCue|null {
  const { start, end, payload } = cueObj;
  const text = payload.join("\n");
  return makeCue(start, end, text);
}

/**
 * Add the corresponding settings on the given cue.
 * /!\ Mutates the cue given.
 * @param {Object} settings - settings for the cue, as a key-value object.
 * @param {VTTCue|TextTrackCue} cue
 */
function setSettingsOnCue(
  settings : Partial<Record<string, string>>,
  cue : VTTCue
) : void {
  if (
    settings.vertical &&
    (settings.vertical === "rl" || settings.vertical === "lr")
  ) {
    cue.vertical = settings.vertical;
  }

  if (settings.line) {

    /**
     * Capture groups:
     *   1 -> percentage position
     *   2 -> optional decimals from percentage position
     *   3 -> optional follow-up of the string indicating alignment value
     *   4 -> alignment value
     * @type {RegExp}
     */
    const percentagePosition = /^(\d+(\.\d+)?)%(,([a-z]+))?/;
    const percentageMatches = settings.line.match(percentagePosition);
    if (percentageMatches) {
      cue.line = Number(percentageMatches[1]);
      cue.snapToLines = false;
      if (arrayIncludes(["start", "center", "end"], percentageMatches[4])) {
        cue.lineAlign = percentageMatches[4];
      }
    } else {
      /**
       * Capture groups:
       *   1 -> line number
       *   2 -> optional follow-up of the string indicating alignment value
       *   3 -> alignment value
       * @type {RegExp}
       */
      const linePosition = /^(-?\d+)(,([a-z]+))?/;
      const lineMatches = settings.line.match(linePosition);

      if (lineMatches) {
        cue.line = Number(lineMatches[1]);
        cue.snapToLines = true;

        if (arrayIncludes(["start", "center", "end"], lineMatches[3])) {
          cue.lineAlign = lineMatches[3];
        }
      }
    }
  }

  if (settings.position) {
    const positionRegex = /^([\d\.]+)%(?:,(line-left|line-right|center))?$/;
    const positionArr = positionRegex.exec(settings.position);
    if (positionArr && positionArr.length >= 2) {
      const position = parseInt(positionArr[1], 10);
      if (!isNaN(position)) {
        cue.position = position;

        if (positionArr[2] != null) {
          cue.positionAlign = positionArr[2];
        }
      }
    }
  }

  if (settings.size) {
    cue.size = settings.size;
  }

  if (
    settings.align &&
    arrayIncludes(["start", "center", "end", "left"], settings.align)
  ) {
    cue.align  = settings.align;
  }
}
