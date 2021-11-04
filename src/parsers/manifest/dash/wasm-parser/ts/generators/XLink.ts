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
import { IPeriodIntermediateRepresentation } from "../../../node_parser_types";
import ParsersStack, {
  IChildrenParser,
} from "../parsers_stack";
import { TagName } from "../types";
import {
  generatePeriodAttrParser,
  generatePeriodChildrenParser,
} from "./Period";

/**
 * Generate a "children parser" when an XLink has been loaded.
 * @param {Object} xlinkObj
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
export function generateXLinkChildrenParser(
  xlinkObj : { periods: IPeriodIntermediateRepresentation[] },
  linearMemory : WebAssembly.Memory,
  parsersStack : ParsersStack,
  fullMpd : ArrayBuffer
)  : IChildrenParser {
  return function onRootChildren(nodeId : number) {
    switch (nodeId) {
      case TagName.Period: {
        const period = { children: { adaptations: [],
                                     baseURLs: [],
                                     eventStreams: [] },
                         attributes: {} };
        xlinkObj.periods.push(period);
        const childrenParser = generatePeriodChildrenParser(period.children,
                                                            linearMemory,
                                                            parsersStack,
                                                            fullMpd);
        const attributeParser = generatePeriodAttrParser(period.attributes, linearMemory);
        parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
        break;
      }

      default:
        // Allows to make sure we're not mistakenly closing a re-opened
        // tag.
        parsersStack.pushParsers(nodeId, noop, noop);
        break;
    }
  };
}
