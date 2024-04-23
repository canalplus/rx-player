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
import type { ITTParameters } from "./get_parameters";
import type { IStyleObject } from "./get_styling";
export interface IParsedTTMLCue {
    /** The DOM Element that contains text node */ paragraph: Element;
    /** An offset to apply to cues start and end */
    timeOffset: number;
    /** An array of objects containing TTML styles */
    idStyles: IStyleObject[];
    /** An array of objects containing region TTML style */
    regionStyles: IStyleObject[];
    /** An object containing paragraph style */
    paragraphStyle: Partial<Record<string, string>>;
    /** An object containing TTML parameters */
    ttParams: ITTParameters;
    shouldTrimWhiteSpace: boolean;
    /** TTML body as a DOM Element */
    body: Element | null;
}
/**
 * Create array of objects which should represent the given TTML text track.
 * TODO TTML parsing is still pretty heavy on the CPU.
 * Optimizations have been done, principally to avoid using too much XML APIs,
 * but we can still do better.
 * @param {string} str
 * @param {Number} timeOffset
 * @returns {Array.<Object>}
 */
export default function parseTTMLString(str: string, timeOffset: number): IParsedTTMLCue[];
