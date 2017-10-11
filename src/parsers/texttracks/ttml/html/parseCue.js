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

import parseTime from "../time_parsing.js";
import createElement from "./createElement.js";

/**
 * Get start and end time of a paragraph.
 * @param {Element} paragraph
 * @param {Object} ttParams
 * @returns {Object}
 */
function getTimeDelimiters(paragraph, ttParams) {
  const start = parseTime(paragraph.getAttribute("begin"), ttParams);
  const duration = parseTime(paragraph.getAttribute("dur"), ttParams);
  const parsedEnd = parseTime(paragraph.getAttribute("end"), ttParams);
  if (start == null || (parsedEnd == null && duration == null)) {
    throw new Error("Invalid text cue");
  }
  const end = parsedEnd == null ? start + duration : parsedEnd;
  return { start, end };
}

/**
 * @param {Element} paragraph
 * @param {Number} offset
 * @param {Array.<Element>} styles
 * @param {Array.<Element>} regions
 * @param {Object} ttParams
 * @returns {Object|null}
 */
export default function parseCue(
  paragraph,
  offset,
  styles,
  regions,
  ttParams
) {
  // Disregard empty elements:
  // TTML allows for empty elements like <div></div>.
  // If paragraph has neither time attributes, nor
  // non-whitespace text, don't try to make a cue out of it.
  if (!paragraph.hasAttribute("begin") && !paragraph.hasAttribute("end") &&
    /^\s*$/.test(paragraph.textContent)
  ) {
    return null;
  }

  const { start, end } = getTimeDelimiters(paragraph, ttParams);
  return {
    start: start + offset,
    end: end + offset,
    element: createElement(paragraph, regions, styles, ttParams),
  };
}
