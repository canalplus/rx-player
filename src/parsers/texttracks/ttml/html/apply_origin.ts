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
 * @param {HTMLElement} element
 * @param {string} origin
 */
export default function applyOrigin(
  element : HTMLElement,
  origin : string
) : void {
  const trimmedOrigin = origin.trim();
  if (trimmedOrigin === "auto") {
    return;
  }
  const splittedOrigin = trimmedOrigin.split(" ");
  if (splittedOrigin.length !== 2) {
    return;
  }
  const firstOrigin = REGXP_LENGTH.exec(splittedOrigin[0]);
  const secondOrigin = REGXP_LENGTH.exec(splittedOrigin[1]);
  if (firstOrigin !== null && secondOrigin !== null) {
    if (firstOrigin[2] === "px" ||
        firstOrigin[2] === "%" ||
        firstOrigin[2] === "em")
    {
      element.style.left = firstOrigin[1] + firstOrigin[2];
    } else if (firstOrigin[2] === "c") {
      addClassName(element, "proportional-style");
      element.setAttribute("data-proportional-left", firstOrigin[1]);
    } else {
      log.warn("TTML Parser: unhandled origin unit:", firstOrigin[2]);
    }

    if (secondOrigin[2] === "px" ||
        secondOrigin[2] === "%" ||
        secondOrigin[2] === "em")
    {
      const toNum = Number(secondOrigin[1]);
      if (secondOrigin[2] === "%" && !isNaN(toNum) &&
          (toNum < 0 || toNum > 100))
      {
        element.style.bottom = "5%";
        element.style.left = "10%";
      } else {
        element.style.top = secondOrigin[1] + secondOrigin[2];
      }
    } else if (secondOrigin[2] === "c") {
      addClassName(element, "proportional-style");
      element.setAttribute("data-proportional-top", secondOrigin[1]);
    } else {
      log.warn("TTML Parser: unhandled origin unit:", secondOrigin[2]);
    }
  }
}
