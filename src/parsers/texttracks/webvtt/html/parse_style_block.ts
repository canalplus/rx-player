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

export interface IStyleElements {
  [className : string]: string;
}

/**
 *
 * Parse style element from WebVTT.
 * @param {Array.<string>} styleBlock
 * @param {Object} baseStyleElements
 * @return {Array.<Object>} styleElements
 */
export default function parseStyleBlock(
  styleBlocks : string[][],
  baseStyleElements : IStyleElements = {}
) : IStyleElements {
  styleBlocks.forEach((styleBlock) => {
    let index = 1;
    const classNames : string[] = [];

    if (styleBlock.length >= 2) {
      if (styleBlock[1].match(/::cue {/)) {
        classNames.push("__global__");
        index++;
      } else {
        let cueClassLine;
        while (
          styleBlock[index] &&
          (cueClassLine = styleBlock[index].match(/::cue\(\.?(.*?)\)(?:,| {)/))
        ) {
          classNames.push(cueClassLine[1]);
          index++;
        }
      }

      let styleContent = "";

      while (
        styleBlock[index] &&
        (!(styleBlock[index].match(/}/) || styleBlock[index].length === 0))
      ) {
        styleContent +=  styleBlock[index];
        index++;
      }
      classNames.forEach((className) => {
        const styleElement = baseStyleElements[className];
        if (!styleElement) {
          baseStyleElements[className] = styleContent.replace(/\s/g, "");
        } else {
          baseStyleElements[className] += styleContent.replace(/\s/g, "");
        }
      });
    }
  });
  return baseStyleElements;
}
