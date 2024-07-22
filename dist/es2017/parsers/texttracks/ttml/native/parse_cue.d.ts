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
import type { ICompatVTTCue } from "../../../../compat/browser_compatibility_types";
import type { IParsedTTMLCue } from "../parse_ttml";
/**
 * Parses an Element into a TextTrackCue or VTTCue.
 * /!\ Mutates the given cueElement Element
 * @param {Element} paragraph
 * @param {Number} offset
 * @param {Array.<Object>} styles
 * @param {Array.<Object>} regions
 * @param {Object} paragraphStyle
 * @param {Object} ttParams
 * @param {Boolean} shouldTrimWhiteSpace
 * @returns {TextTrackCue|null}
 */
export default function parseCue(parsedCue: IParsedTTMLCue): ICompatVTTCue | TextTrackCue | null;
//# sourceMappingURL=parse_cue.d.ts.map