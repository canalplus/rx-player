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
/** Information related to a PSSH box. */
export interface IISOBMFFPSSHInfo {
    /** Corresponding DRM's system ID, as an hexadecimal string. */
    systemId: string;
    /** Additional data contained in the PSSH Box. */
    data: Uint8Array;
}
/**
 * Replace every PSSH box from an ISOBMFF segment by FREE boxes and returns the
 * removed PSSH in an array.
 * Useful to manually manage encryption while avoiding the round-trip with the
 * browser's encrypted event.
 * @param {Uint8Array} data - the ISOBMFF segment
 * @returns {Array.<Uint8Array>} - The extracted PSSH boxes. In the order they
 * are encountered.
 */
export default function takePSSHOut(data: Uint8Array): IISOBMFFPSSHInfo[];
/**
 * Parse systemId from a "pssh" box into an hexadecimal string.
 * `undefined` if we could not extract a systemId.
 * @param {Uint8Array} buff - The pssh box
 * @param {number} initialDataOffset - offset of the first byte after the size
 * and name in this pssh box.
 * @returns {string|undefined}
 */
export declare function getPsshSystemID(buff: Uint8Array, initialDataOffset: number): string | undefined;
