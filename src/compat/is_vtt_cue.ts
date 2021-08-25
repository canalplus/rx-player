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

import { ICompatVTTCue } from "./browser_compatibility_types";

/**
 * Returns true if the given cue is an instance of a VTTCue.
 * @param {*} cue
 * @returns {boolean}
 */
export default function isVTTCue(
  cue : ICompatVTTCue|TextTrackCue
) : cue is ICompatVTTCue {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  return typeof window.VTTCue === "function" && cue instanceof window.VTTCue;
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
}
