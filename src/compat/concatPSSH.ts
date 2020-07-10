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

import { IContentProtectionInitData } from "../parsers/manifest/local/types";
import { concat } from "../utils/byte_parsing";
import {
  isChromecast,
  isEdgeChromium,
  isIEOrEdge,
} from "./browser_detection";

/**
 * Concat PSSH in a unique Uint8Array.
 * If the platform may have Playready CDM, concat playready PSSH
 * at start of initData.
 * @param {Array.<Object>} initDataArr
 * @returns {Uint8Array}
 */
export default function concatPSSH(
  initDataArr: IContentProtectionInitData[]
): Uint8Array {
  if (isIEOrEdge || isEdgeChromium || isChromecast) {
    const initData = initDataArr.reduce((acc, val) => {
      if (val.systemId === "9a04f07998404286ab92e65be0885f95") {
        return concat(val.data, acc);
      }
      return concat(acc, val.data);
    }, new Uint8Array());
    return initData;
  }
  return concat(...initDataArr.map(({ data }) => data));
}
