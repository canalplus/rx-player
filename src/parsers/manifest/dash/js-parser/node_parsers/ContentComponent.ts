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

import isNullOrUndefined from "../../../../../utils/is_null_or_undefined";
import type { ITNode } from "../../../../../utils/xml-parser";
import type { IContentComponentAttributes } from "../../node_parser_types";

/**
 * Parse a "ContentComponent" Element in a DASH MPD.
 * @param {Object} root
 * @returns {Object}
 */
export default function parseContentComponent(root: ITNode): IContentComponentAttributes {
  const ret: IContentComponentAttributes = {};
  for (const attributeName of Object.keys(root.attributes)) {
    const attributeVal = root.attributes[attributeName];
    if (isNullOrUndefined(attributeVal)) {
      continue;
    }
    switch (attributeName) {
      case "id":
        ret.id = attributeVal;
        break;
      case "lang":
        ret.language = attributeVal;
        break;
      case "contentType":
        ret.contentType = attributeVal;
        break;
      case "par":
        ret.par = attributeVal;
        break;
    }
  }

  return ret;
}
