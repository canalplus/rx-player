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

import { base64ToBytes } from "../../../../utils/base64";
import { le2toi } from "../../../../utils/byte_parsing";
import {
  bytesToHex,
  guidToUuid,
  utf16LEToStr,
} from "../../../../utils/string_parsing";

/**
 * Parse PlayReady privateData to get its Hexa-coded KeyID.
 * @param {Uint8Array} privateData
 * @returns {string}
 */
export function getPlayReadyKIDFromPrivateData(
  data: Uint8Array
) : string {
  const xmlLength = le2toi(data, 8);
  const xml = utf16LEToStr(data.subarray(10, xmlLength + 10));
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const kidElement = doc.querySelector("KID");
  if (kidElement === null) {
    throw new Error("Cannot parse PlayReady private data: invalid XML");
  }
  const b64guidKid = kidElement.textContent === null ? "" :
                                                       kidElement.textContent;

  const uuidKid = guidToUuid(base64ToBytes(b64guidKid));
  return bytesToHex(uuidKid).toLowerCase();
}
