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

import log from "../../log";
import {
  be4toi,
  bytesToHex,
  strToBytes,
} from "../../utils/bytes";

import parsePlayreadyKid from "./playready";

const PSSH_TO_INTEGER = be4toi(strToBytes("pssh"), 0);

/**
 * Associate systemId to a parsing function.
 * @param {Uint8Array} privateData
 */
const parseKIDForSystemId: { [id: string]: (privateData: Uint8Array) => string } = {
  "9a04f07998404286ab92e65be0885f95": parsePlayreadyKid,
};

/**
 * Get KID from initData
 * @param initData
 * @returns {string|undefined}
 */
export default function parseKID(initData: Uint8Array): string|undefined {
  let offset = 0;
  let KID;
  while (offset < initData.length) {
    if (
      initData.length < offset + 8 ||
      be4toi(initData, offset + 4) !== PSSH_TO_INTEGER
    ) {
      log.warn("unrecognized initialization data. Use as is.");
      break;
    }
    const len = be4toi(new Uint8Array(initData), offset);
    if (offset + len > initData.length) {
      log.warn("unrecognized initialization data. Use as is.");
      break;
    }
    const pssh = initData.subarray(offset, offset + len);
    const systemId = bytesToHex(pssh.subarray(12, 28));
    const parsingFunc = parseKIDForSystemId[systemId];
    if (parsingFunc) {
      KID = parsingFunc(pssh.subarray(28, Infinity)).toUpperCase();
    }
    offset += len;
  }
  return KID;
}
