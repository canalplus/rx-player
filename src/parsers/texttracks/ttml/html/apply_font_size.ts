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

import { addClassName } from "../../../../compat";
import log from "../../../../log";
import { REGXP_LENGTH } from "../regexps";

/**
 * Apply `tts:fontSize` styling to an HTML element.
 * @param {HTMLElement} element
 * @param {string} fontSize
 */
export default function applyFontSize(
  element : HTMLElement,
  fontSize : string
) : void {
  const trimmedFontSize = fontSize.trim();
  const splittedFontSize = trimmedFontSize.split(" ");
  if (splittedFontSize.length === 0) {
    return;
  }
  const firstFontSize = REGXP_LENGTH.exec(splittedFontSize[0]);
  if (firstFontSize === null) {
    return;
  }

  if (firstFontSize[2] === "px" ||
      firstFontSize[2] === "%" ||
      firstFontSize[2] === "em")
  {
    element.style.fontSize = firstFontSize[1] + firstFontSize[2];
  } else if (firstFontSize[2] === "c") {
    element.style.position = "relative";
    addClassName(element, "proportional-style");
    element.setAttribute("data-proportional-font-size", firstFontSize[1]);
  } else {
    log.warn("TTML Parser: unhandled fontSize unit:", firstFontSize[2]);
  }
}
