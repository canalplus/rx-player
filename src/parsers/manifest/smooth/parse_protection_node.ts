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

import { base64ToBytes } from "../../../utils/base64";
import { concat } from "../../../utils/byte_parsing";
import { hexToBytes } from "../../../utils/string_parsing";
import { getPlayReadyKIDFromPrivateData } from "../../containers/isobmff";

export interface IKeySystem { systemId : string;
                              privateData : Uint8Array; }

export interface IContentProtectionSmooth { keyId : Uint8Array;
                                            keySystems: IKeySystem[]; }

/**
 * @param {Uint8Array} keyIdBytes
 * @returns {Array.<Object>}
 */
function createWidevineKeySystem(keyIdBytes : Uint8Array) : IKeySystem[] {
  return [{ systemId: "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed", // Widevine
            privateData: concat([0x08, 0x01, 0x12, 0x10], keyIdBytes) }];
}

/**
 * Parse "Protection" Node, which contains DRM information
 * @param {Element} protectionNode
 * @returns {Object}
 */
export default function parseProtectionNode(
  protectionNode : Element,
  keySystemCreator : (keyIdBytes : Uint8Array) => IKeySystem[] = createWidevineKeySystem
) : IContentProtectionSmooth {
  if (protectionNode.firstElementChild === null ||
      protectionNode.firstElementChild.nodeName !== "ProtectionHeader")
  {
    throw new Error("Protection should have ProtectionHeader child");
  }
  const header = protectionNode.firstElementChild;
  const privateData = base64ToBytes(header.textContent === null ? "" :
                                                                  header.textContent);
  const keyIdHex = getPlayReadyKIDFromPrivateData(privateData);
  const keyIdBytes = hexToBytes(keyIdHex);

  // remove possible braces
  const systemIdAttr = header.getAttribute("SystemID");
  const systemId = (systemIdAttr !== null ? systemIdAttr :
                                            "")
                     .toLowerCase()
                     .replace(/\{|\}/g, "");
  return { keyId: keyIdBytes,
           keySystems: [ { systemId,
                           privateData,
                           /* keyIds: [keyIdBytes], */ }, ]
            .concat(keySystemCreator(keyIdBytes)), };
}
