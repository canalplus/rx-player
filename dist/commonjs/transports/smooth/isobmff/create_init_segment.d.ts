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
export type IPSSList = Array<{
    systemId: string;
    privateData?: Uint8Array;
    keyIds?: Uint8Array;
}>;
/**
 * Create an initialization segment with the information given.
 * @param {Number} timescale
 * @param {string} type
 * @param {Uint8Array} stsd
 * @param {Uint8Array} mhd
 * @param {Number} width
 * @param {Number} height
 * @param {Array.<Object>} pssList - List of dict, example:
 * {systemId: "DEADBEEF", codecPrivateData: "DEAFBEEF}
 * @returns {Uint8Array}
 */
export default function createInitSegment(timescale: number, type: "audio" | "video", stsd: Uint8Array, mhd: Uint8Array, width: number, height: number): Uint8Array;
