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
import type { IStyleElements } from "./parse_style_block";
export interface IVTTHTMLCue {
    start: number;
    end: number;
    element: HTMLElement;
}
/**
 * Parse cue block into an object with the following properties:
 *   - start {number}: start time at which the cue should be displayed
 *   - end {number}: end time at which the cue should be displayed
 *   - element {HTMLElement}: the cue text, translated into an HTMLElement
 *
 * Returns undefined if the cue block could not be parsed.
 * @param {Array.<string>} cueBlock
 * @param {Number} timeOffset
 * @param {Array.<Object>} classes
 * @returns {Object|undefined}
 */
export default function toHTML(cueObj: {
    start: number;
    end: number;
    settings: Partial<Record<string, string>>;
    header?: string | undefined;
    payload: string[];
}, styling: {
    classes: IStyleElements;
    global?: string | undefined;
}): IVTTHTMLCue;
//# sourceMappingURL=to_html.d.ts.map