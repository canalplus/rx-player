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

import getElementToApplyFromCollection
  from "../getElementToApplyFromCollection.js";
import parseTime from "../time_parsing.js";
import createElement from "./createElement.js";

function getTimeDelimiters(cueElement, rateInfo) {
  const start = parseTime(cueElement.getAttribute("begin"), rateInfo);
  const duration = parseTime(cueElement.getAttribute("dur"), rateInfo);
  const parsedEnd = parseTime(cueElement.getAttribute("end"), rateInfo);
  if (start == null || (parsedEnd == null && duration == null)) {
    throw new Error("Invalid text cue");
  }
  const end = parsedEnd == null ? start + duration : parsedEnd;
  return { start, end };
}

/**
 * @param {Element} cueElement
 * @param {Number} offset
 * @param {Object} rateInfo
 * @param {Array.<Element>} styles
 * @param {Array.<Element>} regions
 * @param {Boolean} shouldTrimWhiteSpace
 * @returns {Object}
 */
export default function parseCue(
  cueElement,
  offset,
  rateInfo,
  styles,
  regions,
  shouldTrimWhiteSpace
) {
  // Disregard empty elements:
  // TTML allows for empty elements like <div></div>.
  // If cueElement has neither time attributes, nor
  // non-whitespace text, don't try to make a cue out of it.
  if (!cueElement.hasAttribute("begin") && !cueElement.hasAttribute("end") &&
    /^\s*$/.test(cueElement.textContent)
  ) {
    return null;
  }

  const { start, end } = getTimeDelimiters(cueElement, rateInfo);
  const region = getElementToApplyFromCollection("region", cueElement, regions);
  return {
    start: start + offset,
    end: end + offset,
    element: createElement(cueElement, region, styles, shouldTrimWhiteSpace),
  };
}
