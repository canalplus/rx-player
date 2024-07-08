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

import log from "../../../../../log";
import isNullOrUndefined from "../../../../../utils/is_null_or_undefined";
import { hexToBytes } from "../../../../../utils/string_parsing";
import type { ITNode } from "../../../../../utils/xml-parser";
import type {
  IContentProtectionAttributes,
  IContentProtectionChildren,
  IContentProtectionIntermediateRepresentation,
} from "../../node_parser_types";
import { parseBase64, textContent } from "./utils";

/**
 * @param {Array.<Object | string>} contentProtectionChildren
 * @Returns {Object}
 */
function parseContentProtectionChildren(
  contentProtectionChildren: Array<ITNode | string>,
): [IContentProtectionChildren, Error[]] {
  const warnings: Error[] = [];
  const cencPssh: Uint8Array[] = [];
  for (let i = 0; i < contentProtectionChildren.length; i++) {
    const currentElement = contentProtectionChildren[i];
    if (typeof currentElement !== "string" && currentElement.tagName === "cenc:pssh") {
      const content = textContent(currentElement.children);
      if (content !== null && content.length > 0) {
        const [toUint8Array, error] = parseBase64(content, "cenc:pssh");
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
  return [{ cencPssh }, warnings];
}

/**
 * @param {Object} root
 * @returns {Object}
 */
function parseContentProtectionAttributes(root: ITNode): IContentProtectionAttributes {
  const ret: IContentProtectionAttributes = {};
  for (const attributeName of Object.keys(root.attributes)) {
    const attributeVal = root.attributes[attributeName];
    if (isNullOrUndefined(attributeVal)) {
      continue;
    }
    switch (attributeName) {
      case "schemeIdUri":
        ret.schemeIdUri = attributeVal;
        break;
      case "value":
        ret.value = attributeVal;
        break;
      case "cenc:default_KID":
        ret.keyId = hexToBytes(attributeVal.replace(/-/g, ""));
        break;
      case "ref":
        ret.ref = attributeVal;
        break;
      case "refId":
        ret.refId = attributeVal;
        break;
    }
  }

  return ret;
}

/**
 * @param {Object} contentProtectionElement
 * @returns {Object}
 */
export default function parseContentProtection(
  contentProtectionElement: ITNode,
): [IContentProtectionIntermediateRepresentation, Error[]] {
  const [children, childrenWarnings] = parseContentProtectionChildren(
    contentProtectionElement.children,
  );
  const attributes = parseContentProtectionAttributes(contentProtectionElement);
  return [{ children, attributes }, childrenWarnings];
}
