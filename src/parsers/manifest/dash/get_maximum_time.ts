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
 * Return maximum seekable time of the MPD at the current time.
 * @param {Object} parsedMPD
 * @param {number|undefined} lastTimeReference - pre-parsed last time reference
 * in the MPD. If undefined, it is not known. A position relative to now will be
 * calculated instead.
 * @returns {number}
 */
export default function getMaximumTime(
  parsedMPD : IParsedManifest,
  lowLatencyMode : boolean,
  lastTimeReference? : number
) : number {
  if (lastTimeReference != null) {
    return lastTimeReference;
  }

  const ast = parsedMPD.availabilityStartTime || 0;
  if (parsedMPD.clockOffset == null) {
    log.warn("DASH Parser: no clock synchronization mechanism found." +
             " Setting a live gap of 10 seconds as a security.");
    const now = Date.now() - ((lowLatencyMode ? 2 : 10) * 1000);
    return now / 1000 - ast;
  } else {
    const now = performance.now() + parsedMPD.clockOffset;
    return now / 1000 - ast;
  }
}
