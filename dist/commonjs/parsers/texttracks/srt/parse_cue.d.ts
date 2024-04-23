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
export interface ISRTCueObject {
    start: number;
    end: number;
    payload: string[];
}
/**
 * Parse cue block into a cue object which contains:
 *   - start {number}: the start of the cue as a timestamp in seconds
 *   - end {number}: the end of the cue as a timestamp in seconds
 *   - payload {Array.<string>}: the payload of the cue
 * @param {Array.<string>} cueLines
 * @param {Number} timeOffset
 * @returns {Object}
 */
export default function parseCueBlock(cueLines: string[], timeOffset: number): ISRTCueObject | null;
