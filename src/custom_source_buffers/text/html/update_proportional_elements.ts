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
 * Update size of element which are proportional to the current text track
 * element.
 * Returns `true` if at least a single styling information is proportional,
 * `false` otherwise.
 * @param {number} currentHeight
 * @param {number} currentWidth
 * @param {Object} resolution
 * @param {HTMLElement} textTrackElement
 * @returns {boolean}
 */
export default function updateProportionalElements(
  currentHeight : number,
  currentWidth : number,
  resolution : { columns : number; rows : number },
  textTrackElement : HTMLElement
) : boolean {
  const cellUnit = [ currentWidth / resolution.columns,
                     currentHeight / resolution.rows];

  const proportElts = textTrackElement.getElementsByClassName("proportional-style");
  for (let eltIdx = 0; eltIdx < proportElts.length; eltIdx++) {
    const elt = proportElts[eltIdx];
    if (elt instanceof HTMLElement) {
      const fontSizeVal = elt.getAttribute("data-proportional-font-size");
      if (fontSizeVal !== null && !isNaN(+fontSizeVal)) {
        elt.style.fontSize = String(+fontSizeVal * cellUnit[1]) + "px";
      }

      const widthVal = elt.getAttribute("data-proportional-width");
      if (widthVal !== null && !isNaN(+widthVal)) {
        elt.style.width = String(+widthVal * cellUnit[0]) + "px";
      }

      const heightVal = elt.getAttribute("data-proportional-height");
      if (heightVal !== null && !isNaN(+heightVal)) {
        elt.style.height = String(+heightVal * cellUnit[1]) + "px";
      }

      const lineHeightVal = elt.getAttribute("data-proportional-line-height");
      if (lineHeightVal !== null && !isNaN(+lineHeightVal)) {
        elt.style.lineHeight = String(+lineHeightVal * cellUnit[1]) + "px";
      }

      const leftVal = elt.getAttribute("data-proportional-left");
      if (leftVal !== null && !isNaN(+leftVal)) {
        elt.style.left = String(+leftVal * cellUnit[0]) + "px";
      }

      const topVal = elt.getAttribute("data-proportional-top");
      if (topVal !== null && !isNaN(+topVal)) {
        elt.style.top = String(+topVal * cellUnit[1]) + "px";
      }

      const paddingTopVal = elt.getAttribute("data-proportional-padding-top");
      if (paddingTopVal !== null && !isNaN(+paddingTopVal)) {
        elt.style.paddingTop = String(+paddingTopVal * cellUnit[1]) + "px";
      }

      const paddingBottomVal = elt.getAttribute("data-proportional-padding-bottom");
      if (paddingBottomVal !== null && !isNaN(+paddingBottomVal)) {
        elt.style.paddingBottom = String(+paddingBottomVal * cellUnit[1]) + "px";
      }

      const paddingLeftVal = elt.getAttribute("data-proportional-padding-left");
      if (paddingLeftVal !== null && !isNaN(+paddingLeftVal)) {
        elt.style.paddingLeft = String(+paddingLeftVal * cellUnit[0]) + "px";
      }

      const paddingRightVal = elt.getAttribute("data-proportional-padding-right");
      if (paddingRightVal !== null && !isNaN(+paddingRightVal)) {
        elt.style.paddingRight = String(+paddingRightVal * cellUnit[0]) + "px";
      }
    }
  }
  return proportElts.length > 0;
}
