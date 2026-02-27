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

import addClassName from "../../../../compat/add_class_name";
import log from "../../../../log";
import { REGXP_LENGTH } from "../regexps";

/**
 * @param {HTMLElement} element
 * @param {string} lineHeight
 */
export default function applyLineHeight(element: HTMLElement, lineHeight: string): void {
  const trimmedLineHeight = lineHeight.trim();
  const splittedLineHeight = trimmedLineHeight.split(" ");

  if (trimmedLineHeight === "auto") {
    return;
  }
  const firstLineHeight = REGXP_LENGTH.exec(splittedLineHeight[0]);
  if (firstLineHeight === null) {
    return;
  }
  if (
    firstLineHeight[2] === "px" ||
    // TODO: For now, we disable the percentage unit as its rules are complex to
    // implement in our current logic:
    // A percentage `lineHeight` depends on the `fontSize` computed at that point,
    // yet a lineHeight applies to a `p` in TTML and `fontSize` applies to a `span`
    // (below `p`) and our translation applies that same level of style: CSS `lineHeight`
    // is set on the element defining it, but `fontSize` is set at the end on each cue.
    //
    // Thus we cannot easily just rely on CSS' similar behavior for percentage
    // `lineHeight`s because the `fontSize` might not be known at that point by
    // the CSS (yet it might be for TTML). Work-around tricks are not straightforward
    // either (e.g. we cannot just repeat the `fontSize` at both places because
    // the potential percentage values in which they are expressed could coumpound).
    // Seeing other players, it also seems poorly supported, so for now I think
    // we can just ignore those. In a perfect world, it should be implemented
    // though!
    // firstLineHeight[2] === "%" ||
    firstLineHeight[2] === "em"
  ) {
    element.style.lineHeight = firstLineHeight[1] + firstLineHeight[2];
  } else if (firstLineHeight[2] === "c") {
    addClassName(element, "proportional-style");
    element.setAttribute("data-proportional-line-height", firstLineHeight[1]);
  } else {
    log.warn("ttml", "unhandled lineHeight unit", { unit: firstLineHeight[2] });
  }
}
