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
  [className : string]: {
    isGlobalStyle : boolean;
    styleContent : string;
  };
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
    const classNames : Array<{
      isGlobalStyle : boolean;
      className? : string;
    }> = [];

    if (styleBlock.length >= 2) {
      if (styleBlock[1].match(/::cue {/)) {
        classNames.push({ isGlobalStyle: true });
        index++;
      } else {
        let cueClassLine;
        while (
          styleBlock[index] &&
          (cueClassLine = styleBlock[index].match(/::cue\(\.?(.*?)\)(?:,| {)/))
        ) {
          classNames.push({
            className: cueClassLine[1],
            isGlobalStyle: false,
          });
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
      classNames.forEach(name => {
        if (name.className) {
          const styleElement = baseStyleElements[name.className];
          if (!styleElement) {
            baseStyleElements[name.className] = {
              isGlobalStyle: name.isGlobalStyle,
              styleContent: styleContent.replace(/\s/g, ""),
            };
          } else {
            styleElement.styleContent += styleContent.replace(/\s/g, "");
          }
        }
      });
    }
  });
  return baseStyleElements;
}
