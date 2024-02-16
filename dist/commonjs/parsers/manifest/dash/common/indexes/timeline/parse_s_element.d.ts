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
import type { ITNode } from "../../../../../../utils/xml-parser";
/** SegmentTimeline `S` element once parsed. */
export interface IParsedS {
    /** Start time in a previously-given timescaled unit. */
    start?: number;
    /**
     * Amount of repetition(s).
     * 0 = no repeat.
     * negative number = max possible repeat.
     */
    repeatCount?: number;
    /** Duration of the content in a previously-given timescaled unit. */
    duration?: number;
}
/**
 * Parse a given <S> element in the MPD under a parsed Node form into a JS
 * Object.
 * @param {Object} root
 * @returns {Object}
 */
export declare function parseSElementNode(root: ITNode): IParsedS;
/**
 * Parse a given <S> element in the MPD under an `Element` form into a JS
 * Object.
 * @param {Element} root
 * @returns {Object}
 */
export declare function parseSHTMLElement(root: Element): IParsedS;
