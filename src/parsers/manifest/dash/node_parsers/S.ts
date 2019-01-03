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

export interface IParsedS {
  start? : number;
  repeatCount? : number; // Amount of repetition(s)
                         // 0 = no repeat
                         // negative number = max possible repeat
  duration? : number;
}

/**
 * @param {Element} root
 * @returns {Object}
 */
export default function parseS(root : Element) : IParsedS {
  let start : number|undefined;
  let duration : number|undefined;
  let repeatCount : number|undefined;

  for (let j = 0; j < root.attributes.length; j++) {
    const attribute = root.attributes[j];

    switch (attribute.name) {
      case "t":
        start = parseInt(attribute.value, 10);
        break;
      case "d":
        duration = parseInt(attribute.value, 10);
        break;
      case "r":
        repeatCount = parseInt(attribute.value, 10);
        break;
    }
  }
  return { start, duration, repeatCount };
}
