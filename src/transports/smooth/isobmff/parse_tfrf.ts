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

import { getUuidContent } from "../../../parsers/containers/isobmff";
import {
  be4toi,
  be8toi,
} from "../../../utils/byte_parsing";

export interface IISOBMFFBasicSegment {
  time : number;
  duration : number;
}

/**
 * @param {Uint8Array} traf
 * @returns {Array.<Object>}
 */
export default function parseTfrf(traf : Uint8Array) : IISOBMFFBasicSegment[] {
  const tfrf = getUuidContent(traf, 0xD4807EF2, 0XCA394695, 0X8E5426CB, 0X9E46A79F);
  if (!tfrf) {
    return [];
  }

  const frags : Array<{ time: number; duration: number }> = [];
  const version = tfrf[0];
  const fragCount = tfrf[4];
  for (let i = 0; i < fragCount; i++) {
    let duration;
    let time;
    if (version === 1) {
      time = be8toi(tfrf, i * 16 + 5);
      duration  = be8toi(tfrf, i * 16 + 5 + 8);
    } else {
      time = be4toi(tfrf, i * 8 + 5);
      duration = be4toi(tfrf, i * 8 + 5 + 4);
    }
    frags.push({
      time,
      duration,
    });
  }
  return frags;
}
