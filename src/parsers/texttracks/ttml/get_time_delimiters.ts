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

import isNonEmptyString from "../../../utils/is_non_empty_string";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import type { ITTParameters } from "./get_parameters";
import parseTime from "./time_parsing";

/**
 * Get start and end time of an element.
 * @param {Element} element
 * @param {Object} ttParams
 * @returns {Object}
 */
export default function getTimeDelimiters(
  element: Element,
  ttParams: ITTParameters,
): { start: number; end: number } {
  const beginAttr = element.getAttribute("begin");
  const durationAttr = element.getAttribute("dur");
  const endAttr = element.getAttribute("end");

  const start = isNonEmptyString(beginAttr) ? parseTime(beginAttr, ttParams) : null;
  const duration = isNonEmptyString(durationAttr)
    ? parseTime(durationAttr, ttParams)
    : null;
  const parsedEnd = isNonEmptyString(endAttr) ? parseTime(endAttr, ttParams) : null;
  if (
    isNullOrUndefined(start) ||
    (isNullOrUndefined(parsedEnd) && isNullOrUndefined(duration))
  ) {
    throw new Error("Invalid text cue");
  }

  const end = isNullOrUndefined(parsedEnd) ? start + (duration as number) : parsedEnd;
  return { start, end };
}
