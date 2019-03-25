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

import log from "../../../log";
import { IParsedManifest } from "../types";

/**
 * Get presentation live gap from manifest informations.
 * @param {Object} manifest
 * @returns {number}
 */
export default function getPresentationLiveGap(
  parsedMPD: IParsedManifest,
  lastTimeReference? : number
) : number {
  if (lastTimeReference != null) {
    const ast = parsedMPD.availabilityStartTime || 0;
    const now = Date.now() - (parsedMPD.clockOffset || 0);
    return (now / 1000) - (lastTimeReference + ast);
  } else if (parsedMPD.clockOffset != null) {
    return 0;
  } else {
    log.warn("DASH Parser: no clock synchronization mechanism found." +
      "Setting a live gap of 10 seconds as a security.");
    return 10; // put 10 seconds as a security
  }
}
