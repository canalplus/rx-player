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

import { normalize as normalizeLang } from "../../../../utils/languages";
import {
  parseRatio,
} from "../helpers";

export interface IParsedContentComponent {
  id?: string;
  language?: string;
  normalizedLanguage? : string;
  contentType?: string;
  par?: string;
}

/**
 * Parse a "ContentComponent" Node in a DASH MPD.
 * @param {Node} root
 * @returns {Object}
 */
export default function parseContentComponent(root: Node): IParsedContentComponent {
  let id : string|undefined;
  let lang : string|undefined;
  let contentType : string|undefined;
  let par : string|undefined;

  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {
      case "id":
        id = attribute.value;
        break;
      case "lang":
        lang = attribute.value;
        break;
      case "contentType":
        contentType = attribute.value;
        break;
      case "par":
        par = parseRatio(attribute.value);
        break;
    }
  }

  return {
    id,
    language: lang,
    normalizedLanguage: lang && normalizeLang(lang),
    contentType,
    par,
  };
}
