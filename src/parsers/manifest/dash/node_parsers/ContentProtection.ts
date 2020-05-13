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

import base64ToUint8Array from "../../../../utils/base64_to_uint8array";
import { hexToBytes } from "../../../../utils/byte_parsing";

export interface IParsedContentProtection {
  children : IContentProtectionChildren;
  attributes : IContentProtectionAttributes;
}

export interface IContentProtectionChildren {
  cencPssh : Uint8Array[];
}

export interface IContentProtectionAttributes {
  // optional
  schemeIdUri? : string;
  value? : string;
  keyId? : Uint8Array;
}

/**
 * @param {NodeList} contentProtectionChildren
 * @Returns {Object}
 */
function parseContentProtectionChildren(
  contentProtectionChildren : NodeList
) : IContentProtectionChildren {
  const cencPssh : Uint8Array[] = [];
  for (let i = 0; i < contentProtectionChildren.length; i++) {
    if (contentProtectionChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentElement = contentProtectionChildren[i] as Element;
      if (currentElement.nodeName === "cenc:pssh") {
        const content = currentElement.textContent;
        if (content !== null && content.length > 0) {
          cencPssh.push(base64ToUint8Array(content));
        }
      }
    }
  }
  return { cencPssh };
}

/**
 * @param {Element} root
 * @returns {Object}
 */
function parseContentProtectionAttributes(
  root: Element
) : IContentProtectionAttributes {
  let schemeIdUri : string | undefined;
  let value : string | undefined;
  let keyId : Uint8Array | undefined;
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

/**
 * @param {Element} contentProtectionElement
 * @returns {Object}
 */
export default function parseContentProtection(
  contentProtectionElement : Element
) : IParsedContentProtection {
  return {
    children: parseContentProtectionChildren(contentProtectionElement.childNodes),
    attributes: parseContentProtectionAttributes(contentProtectionElement),
  };
}
