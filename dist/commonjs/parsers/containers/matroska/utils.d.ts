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
export interface ICuesSegment {
    time: number;
    duration: number;
    timescale: number;
    range: [number, number];
}
/**
 * Return the timecode scale (basically timescale) of the whole file.
 * @param {Uint8Array} buffer
 * @param {number} initialOffset
 * @returns {number|null}
 */
export declare function getTimeCodeScale(buffer: Uint8Array, initialOffset: number): number | null;
/**
 * @param {Uint8Array} buffer
 * @param {number} initialOffset
 * @returns {Array.<Object>|null}
 */
export declare function getSegmentsFromCues(buffer: Uint8Array, initialOffset: number): ICuesSegment[] | null;
