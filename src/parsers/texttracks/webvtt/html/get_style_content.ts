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

/**
 * Concat and format style content from block.
 * @param {string} styleBlock
 * @returns {string}
 */
export default function getStyleContent(styleBlock: string[]): string {
  let styleContent = "";
  let index = 0;
  while (
    styleBlock[index] &&
    (!(styleBlock[index].match(/}/) || styleBlock[index].length === 0))
  ) {
    styleContent += styleBlock[index];
    index++;
  }
  return styleContent;
}
