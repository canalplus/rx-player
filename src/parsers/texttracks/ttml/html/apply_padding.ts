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
 * @param {string} padding
 */
export default function applyPadding(
  element : HTMLElement,
  padding : string
) : void {
  const trimmedPadding = padding.trim();
  const splittedPadding = trimmedPadding.split(" ");
  if (splittedPadding.length < 1) {
    return;
  }

  const firstPadding = REGXP_LENGTH.exec(splittedPadding[0]);
  if (firstPadding === null) {
    return;
  }
  if (firstPadding[2] === "px" ||
      firstPadding[2] === "%" ||
      firstPadding[2] === "em")
  {
    const firstPaddingValue = firstPadding[1] + firstPadding[2];
    if (splittedPadding.length === 1) {
      element.style.padding = firstPaddingValue;
    } else if (splittedPadding.length === 2) {
      element.style.paddingTop = firstPaddingValue;
      element.style.paddingBottom = firstPaddingValue;
    } else {
      element.style.paddingTop = firstPaddingValue;
    }
  } else if (firstPadding[2] === "c") {
    addClassName(element, "proportional-style");
    if (splittedPadding.length === 1) {
      element.setAttribute("data-proportional-padding-top", firstPadding[1]);
      element.setAttribute("data-proportional-padding-bottom", firstPadding[1]);
      element.setAttribute("data-proportional-padding-left", firstPadding[1]);
      element.setAttribute("data-proportional-padding-right", firstPadding[1]);
    } else if (splittedPadding.length === 2) {
      element.setAttribute("data-proportional-padding-top", firstPadding[1]);
      element.setAttribute("data-proportional-padding-bottom", firstPadding[1]);
    } else {
      element.setAttribute("data-proportional-padding-top", firstPadding[1]);
    }
  } else {
    log.warn("TTML Parser: unhandled padding unit:", firstPadding[2]);
  }

  if (splittedPadding.length === 1) {
    return;
  }

  const secondPadding = REGXP_LENGTH.exec(splittedPadding[1]);
  if (secondPadding === null) {
    return;
  }
  if (secondPadding[2] === "px" ||
      secondPadding[2] === "%" ||
      secondPadding[2] === "em")
  {
    const secondPaddingValue = secondPadding[1] + secondPadding[2];
    if (splittedPadding.length < 4) {
      element.style.paddingLeft = secondPaddingValue;
      element.style.paddingRight = secondPaddingValue;
    } else {
      element.style.paddingRight = secondPaddingValue;
    }
  } else if (secondPadding[2] === "c") {
    addClassName(element, "proportional-style");
    if (splittedPadding.length < 4) {
      element.setAttribute("data-proportional-padding-left", secondPadding[1]);
      element.setAttribute("data-proportional-padding-right", secondPadding[1]);
    } else {
      element.setAttribute("data-proportional-padding-right", secondPadding[1]);
    }
  } else {
    log.warn("TTML Parser: unhandled padding unit:", secondPadding[2]);
  }

  if (splittedPadding.length === 2) {
    return;
  }

  const thirdPadding = REGXP_LENGTH.exec(splittedPadding[2]);
  if (thirdPadding === null) {
    return;
  }
  if (thirdPadding[2] === "px" ||
      thirdPadding[2] === "%" ||
      thirdPadding[2] === "em")
  {
    const thirdPaddingValue = thirdPadding[1] + thirdPadding[2];
    element.style.paddingBottom = thirdPaddingValue;
  } else if (thirdPadding[2] === "c") {
    addClassName(element, "proportional-style");
    element.setAttribute("data-proportional-padding-bottom", thirdPadding[1]);
  } else {
    log.warn("TTML Parser: unhandled padding unit:", thirdPadding[2]);
  }

  if (splittedPadding.length === 3) {
    return;
  }

  const fourthPadding = REGXP_LENGTH.exec(splittedPadding[3]);
  if (fourthPadding === null) {
    return;
  }
  if (fourthPadding[2] === "px" ||
      fourthPadding[2] === "%" ||
      fourthPadding[2] === "em")
  {
    const fourthPaddingValue = fourthPadding[1] + fourthPadding[2];
    element.style.paddingLeft = fourthPaddingValue;
  } else if (fourthPadding[2] === "c") {
    addClassName(element, "proportional-style");
    element.setAttribute("data-proportional-padding-left", fourthPadding[1]);
  } else {
    log.warn("TTML Parser: unhandled padding unit:", fourthPadding[2]);
  }
}
