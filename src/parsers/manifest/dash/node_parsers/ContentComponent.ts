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

/** The ContentComponent once parsed. */
export interface IParsedContentComponent {
  id?: string;
  language?: string;
  contentType?: string;
  par?: string;
}

/**
 * Parse a "ContentComponent" Element in a DASH MPD.
 * @param {Element} root
 * @returns {Object}
 */
export default function parseContentComponent(root: Element) : IParsedContentComponent {
  const ret : IParsedContentComponent = {};

  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {
      case "id":
        ret.id = attribute.value;
        break;
      case "lang":
        ret.language = attribute.value;
        break;
      case "contentType":
        ret.contentType = attribute.value;
        break;
      case "par":
        ret.par = attribute.value;
        break;
    }
  }

  return ret;
}
