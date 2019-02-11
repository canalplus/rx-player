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

import { hexToBytes } from "../../../../utils/byte_parsing";

export interface IParsedContentProtection {
  schemeIdUri? : string;
  value? : string;
  keyId? : Uint8Array;
}

/**
 * Parse the "ContentProtection" node of a MPD.
 * @param {Element} root
 * @returns {Object}
 */
export default function parseContentProtection(
  root: Element
) : IParsedContentProtection|undefined {
  let schemeIdUri : string|undefined;
  let value : string|undefined;
  let keyId : Uint8Array|undefined;
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {
      case "schemeIdUri":
        schemeIdUri = attribute.value;
        break;
      case "value":
        value = attribute.value;
        break;
      case "cenc:default_KID":
        keyId = hexToBytes(attribute.value.replace(/-/g, ""));
    }
  }

  return { schemeIdUri, value, keyId };
}
