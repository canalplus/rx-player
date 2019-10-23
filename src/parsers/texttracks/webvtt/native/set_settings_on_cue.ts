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

import { ICompatVTTCue } from "../../../../compat/index";
import arrayIncludes from "../../../../utils/array_includes";
import isNonEmptyString from "../../../../utils/is_non_empty_string";

/**
 * Add the corresponding settings on the given cue.
 * /!\ Mutates the cue given.
 * @param {Object} settings - settings for the cue, as a key-value object.
 * @param {ICompatVTTCue|TextTrackCue} cue
 */
export default function setSettingsOnCue(
  settings : Partial<Record<string, string>>,
  cue : ICompatVTTCue
) : void {
  if (isNonEmptyString(settings.vertical) &&
      (settings.vertical === "rl" || settings.vertical === "lr"))
  {
    cue.vertical = settings.vertical;
  }

  if (isNonEmptyString(settings.line)) {

    // Capture groups:
    //   1 -> percentage position
    //   2 -> optional decimals from percentage position
    //   3 -> optional follow-up of the string indicating alignment value
    //   4 -> alignment value
    const percentagePosition = /^(\d+(\.\d+)?)%(,([a-z]+))?/;
    const percentageMatches = settings.line.match(percentagePosition);
    if (Array.isArray(percentageMatches)) {
      cue.line = Number(percentageMatches[1]);
      cue.snapToLines = false;
      if (arrayIncludes(["start", "center", "end"], percentageMatches[4])) {
        cue.lineAlign = percentageMatches[4];
      }
    } else {
      // Capture groups:
      //   1 -> line number
      //   2 -> optional follow-up of the string indicating alignment value
      //   3 -> alignment value
      const linePosition = /^(-?\d+)(,([a-z]+))?/;
      const lineMatches = settings.line.match(linePosition);

      if (Array.isArray(lineMatches)) {
        cue.line = Number(lineMatches[1]);
        cue.snapToLines = true;

        if (arrayIncludes(["start", "center", "end"], lineMatches[3])) {
          cue.lineAlign = lineMatches[3];
        }
      }
    }
  }

  if (isNonEmptyString(settings.position)) {
    const positionRegex = /^([\d\.]+)%(?:,(line-left|line-right|center))?$/;
    const positionArr = positionRegex.exec(settings.position);
    if (Array.isArray(positionArr) && positionArr.length >= 2) {
      const position = parseInt(positionArr[1], 10);
      if (!isNaN(position)) {
        cue.position = position;

        if (positionArr[2] !== undefined) {
          cue.positionAlign = positionArr[2];
        }
      }
    }
  }

  if (isNonEmptyString(settings.size)) {
    cue.size = settings.size;
  }

  if (typeof settings.align === "string" &&
      arrayIncludes(["start", "center", "end", "left"], settings.align))
  {
    cue.align  = settings.align;
  }
}
