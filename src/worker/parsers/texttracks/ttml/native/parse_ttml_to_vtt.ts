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

import { ICompatVTTCue } from "../../../../compat";
import parseTtml from "../parse_ttml";
import parseCue from "./parse_cue";

/**
 * @param str
 * @param timeOffset
 */
export default function parseTtmlToNative(
  str : string,
  timeOffset : number
): Array<TextTrackCue | ICompatVTTCue> {
  const parsedCues = parseTtml(str, timeOffset);
  const cues: Array<TextTrackCue | ICompatVTTCue> = [];
  for (let i = 0; i < parsedCues.length; i++) {
    const parsedCue = parsedCues[i];
    const cue = parseCue(parsedCue);
    if (cue !== null) {
      cues.push(cue);
    }
  }
  return cues;
}
