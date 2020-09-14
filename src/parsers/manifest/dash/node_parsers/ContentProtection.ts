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

import log from "../../../../log";
import { hexToBytes } from "../../../../utils/string_parsing";
import { parseBase64 } from "./utils";

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
) : [IContentProtectionChildren, Error[]] {
  const warnings : Error[] = [];
  const cencPssh : Uint8Array[] = [];
  for (let i = 0; i < contentProtectionChildren.length; i++) {
    if (contentProtectionChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentElement = contentProtectionChildren[i] as Element;
      if (currentElement.nodeName === "cenc:pssh") {
        const content = currentElement.textContent;
        if (content !== null && content.length > 0) {
          const [ toUint8Array,
                  error ] = parseBase64(content, "cenc:pssh");
          if (error !== null) {
            log.warn(error.message);
            warnings.push(error);
          }
          if (toUint8Array !== null) {
            cencPssh.push(toUint8Array);
          }
        }
      }
    }
  }
  return [{ cencPssh }, warnings];
}

/**
 * @param {Element} root
 * @returns {Object}
 */
function parseContentProtectionAttributes(
  root: Element
) : IContentProtectionAttributes {
  const ret : IContentProtectionAttributes = {};
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {
      case "schemeIdUri":
        ret.schemeIdUri = attribute.value;
        break;
      case "value":
        ret.value = attribute.value;
        break;
      case "cenc:default_KID":
        ret.keyId = hexToBytes(attribute.value.replace(/-/g, ""));
    }
  }

  return ret;
}

/**
 * @param {Element} contentProtectionElement
 * @returns {Object}
 */
export default function parseContentProtection(
  contentProtectionElement : Element
) : [IParsedContentProtection, Error[]] {
  const [ children, childrenWarnings ] =
    parseContentProtectionChildren(contentProtectionElement.childNodes);
  const attributes = parseContentProtectionAttributes(contentProtectionElement);
  return [ { children, attributes }, childrenWarnings ];
}
