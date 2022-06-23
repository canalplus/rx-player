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

import { base64ToBytes } from "../../../../../../utils/base64";
import { hexToBytes } from "../../../../../../utils/string_parsing";
import {
  IContentProtectionIntermediateRepresentation,
} from "../../../node_parser_types";
import { IAttributeParser } from "../parsers_stack";
import { AttributeName } from "../types";
import { parseString } from "../utils";

/**
 * @param {Object} cpAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export function generateContentProtectionAttrParser(
  cp : IContentProtectionIntermediateRepresentation,
  linearMemory : WebAssembly.Memory
)  : IAttributeParser {
  const cpAttrs = cp.attributes;
  const cpChildren = cp.children;
  const textDecoder = new TextDecoder();
  return function onContentProtectionAttribute(
    attr : number,
    ptr : number,
    len : number
  ) {
    switch (attr) {
      case AttributeName.SchemeIdUri:
        cpAttrs.schemeIdUri = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.ContentProtectionValue:
        cpAttrs.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
        break;
      case AttributeName.ContentProtectionKeyId:
        const kid = parseString(textDecoder, linearMemory.buffer, ptr, len);
        cpAttrs.keyId = hexToBytes(kid.replace(/-/g, ""));
        break;
      case AttributeName.ContentProtectionCencPSSH:
        try {
          const b64 = parseString(textDecoder, linearMemory.buffer, ptr, len);
          cpChildren.cencPssh.push(base64ToBytes(b64));
        } catch (_) { /* TODO log error? register as warning? */ }
        break;
    }
  };
}
