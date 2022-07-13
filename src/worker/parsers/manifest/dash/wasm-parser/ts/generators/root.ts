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

import noop from "../../../../../../utils/noop";
import {
  IMPDIntermediateRepresentation,
} from "../../../node_parser_types";
import ParsersStack from "../parsers_stack";
import { TagName } from "../types";
import {
  generateMPDAttrParser,
  generateMPDChildrenParser,
} from "./MPD";

/**
 * @param {Object} rootObj
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
export function generateRootChildrenParser(
  rootObj : { mpd? : IMPDIntermediateRepresentation },
  linearMemory : WebAssembly.Memory,
  parsersStack : ParsersStack,
  fullMpd : ArrayBuffer
)  : (nodeId : number) => void {
  return function onRootChildren(nodeId : number) {
    switch (nodeId) {
      case TagName.MPD:
        rootObj.mpd = { children: { baseURLs: [],
                                    locations : [],
                                    periods: [],
                                    utcTimings: [] },
                        attributes: {} };
        const childrenParser = generateMPDChildrenParser(rootObj.mpd.children,
                                                         linearMemory,
                                                         parsersStack,
                                                         fullMpd);
        const attributeParser = generateMPDAttrParser(rootObj.mpd.children,
                                                      rootObj.mpd.attributes,
                                                      linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;

      default:
        // Allows to make sure we're not mistakenly closing a re-opened
        // tag.
        parsersStack.pushParsers(nodeId, noop, noop);
        break;
    }
  };
}
