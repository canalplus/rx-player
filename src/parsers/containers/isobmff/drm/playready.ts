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

import {
    be4toi,
    bytesToUTF16Str,
    guidToUuid,
    le2toi,
} from "../../../../utils/bytes";

/**
 * Parse PlayReady privateData to get KID.
 * @param {Uint8Array} privateData
 * @returns {string}
 */
export default function getPlayreadyKIDFromPrivateData(
  privateData: Uint8Array
) : string {
  const dataLength = be4toi(privateData, 0);
  const data = privateData.subarray(4, dataLength);
  const xmlLength = le2toi(data, 8);
  const xml = bytesToUTF16Str(data.subarray(10, xmlLength + 10));
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const kidElement = doc.querySelector("KID");
  if (!kidElement) {
    throw new Error("invalid XML");
  }
  const kid = kidElement.textContent || "";
  return guidToUuid(atob(kid)).toLowerCase();
}
