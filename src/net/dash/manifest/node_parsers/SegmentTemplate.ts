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
  parseBoolean,
} from "../helpers";
import { IParsedInitialization } from "./Initialization";
import {
  IMultipleSegmentBase,
  parseMultipleSegmentBase,
} from "./SegmentBase";

interface ISegmentTemplateAttributes extends IMultipleSegmentBase {
  media? : string;
  initialization?: IParsedInitialization;
  index? : string;
  bitstreamSwitching? : boolean;
}

export interface IParsedSegmentTemplate extends IMultipleSegmentBase {
  indexType: string;
  media? : string;
  initialization?: IParsedInitialization;
  index? : string;
  bitstreamSwitching? : boolean;
}

/**
 * Parse initialization attribute found in segment Template to
 * correspond to the initialization found in a regular segmentBase.
 * @param {string} attrValue
 * @returns {Object}
 */
function parseInitializationAttribute(attrValue : string) : IParsedInitialization  {
  return { media: attrValue };
}

/**
 * @param {Node} root
 * @returns {Object}
 */
export default function parseSegmentTemplate(root: Node): IParsedSegmentTemplate {

  const base : ISegmentTemplateAttributes = parseMultipleSegmentBase(root);
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.nodeName) {

      case "initialization":
        if (base.initialization == null) {
          base.initialization = parseInitializationAttribute(attribute.value);
        }
        break;

      case "index":
        base.index = attribute.value;
        break;

      case "media":
        base.media = attribute.value;
        break;

      case "bitstreamSwitching":
        base.bitstreamSwitching = parseBoolean(attribute.value);
        break;
    }
  }

  const indexType = base.indexType == null ?
    "template" : base.indexType;

  return Object.assign(base, { indexType });
}
