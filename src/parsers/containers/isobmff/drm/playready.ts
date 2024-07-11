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

import arrayFind from "../../../../utils/array_find";
import { base64ToBytes } from "../../../../utils/base64";
import { le2toi } from "../../../../utils/byte_parsing";
import { bytesToHex, guidToUuid, utf16LEToStr } from "../../../../utils/string_parsing";
import type { ITNode } from "../../../../utils/xml-parser";
import {
  getFirstElementByTagName,
  parseXml,
  toContentString,
} from "../../../../utils/xml-parser";

/**
 * Parse PlayReady privateData to get its Hexa-coded KeyID.
 * @param {Uint8Array} data
 * @returns {string}
 */
export function getPlayReadyKIDFromPrivateData(data: Uint8Array): string {
  const xmlLength = le2toi(data, 8);
  const xml = utf16LEToStr(data.subarray(10, xmlLength + 10));
  const doc = arrayFind(parseXml(xml), (elt): elt is ITNode => {
    return typeof elt !== "string";
  }) as ITNode | undefined;
  const kidElement = doc === undefined ? null : getFirstElementByTagName(doc, "KID");
  if (kidElement === null) {
    throw new Error("Cannot parse PlayReady private data: invalid XML");
  }
  const b64guidKid = toContentString(kidElement);
  const uuidKid = guidToUuid(base64ToBytes(b64guidKid));
  return bytesToHex(uuidKid).toLowerCase();
}
