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
/**
 * Returns the content of the first "traf" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
declare function getTRAF(buffer: Uint8Array): Uint8Array | null;
/**
 * Returns the content of all "traf" boxes encountered in the given ISOBMFF
 * data.
 * Might be preferred to just `getTRAF` if you suspect that your ISOBMFF may
 * have multiple "moof" boxes.
 * @param {Uint8Array} buffer
 * @returns {Array.<Uint8Array>}
 */
declare function getTRAFs(buffer: Uint8Array): Uint8Array[];
/**
 * Returns the content of the first "moof" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
declare function getMDAT(buf: Uint8Array): Uint8Array | null;
/**
 * Returns the content of the first "mdia" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
declare function getMDIA(buf: Uint8Array): Uint8Array | null;
/**
 * Returns the content of the first "emsg" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
declare function getEMSG(buffer: Uint8Array, offset?: number): Uint8Array | null;
export { getTRAF, getTRAFs, getMDAT, getMDIA, getEMSG };
//# sourceMappingURL=read.d.ts.map