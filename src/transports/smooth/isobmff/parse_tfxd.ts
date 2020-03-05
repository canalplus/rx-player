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
import { be8toi } from "../../../utils/byte_parsing";

export interface IISOBMFFBasicSegment {
  time : number;
  duration : number;
}

/**
 * @param {Uint8Array} traf
 * @returns {Object|undefined}
 */
export default function parseTfxd(traf : Uint8Array) : IISOBMFFBasicSegment|undefined {
  const tfxd = getUuidContent(traf, 0x6D1D9B05, 0x42D544E6, 0x80E2141D, 0xAFF757B2);
  if (tfxd === undefined) {
    return undefined;
  }
  return {
    duration:  be8toi(tfxd, 12),
    time: be8toi(tfxd,  4),
  };
}
