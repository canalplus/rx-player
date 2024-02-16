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
 * From a given buffer representing ISOBMFF data, browses inner boxes in
 * `childNames`, each element being a child box of the one before it.
 * Returns `null` if one of the child (or if the parent) is not found.
 * @param {Uint8Array} buf
 * @param {number[]} childNames
 * @returns {Uint8Array|null}
 */
declare function getChildBox(buf: Uint8Array, childNames: number[]): Uint8Array | null;
/**
 * Returns the content of a box based on its name.
 * `null` if not found.
 * @param {Uint8Array} buf - the isobmff data
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 byte integer
 * generated from encoding the corresponding ASCII in big endian.
 * @returns {UInt8Array|null}
 */
declare function getBoxContent(buf: Uint8Array, boxName: number): Uint8Array | null;
/**
 * Reads the whole ISOBMFF and returns the content of all boxes with the given
 * name, in order.
 * @param {Uint8Array} buf - the isobmff data
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 byte integer
 * generated from encoding the corresponding ASCII in big endian.
 * @returns {Array.<Uint8Array>}
 */
declare function getBoxesContent(buf: Uint8Array, boxName: number): Uint8Array[];
/**
 * Returns an ISOBMFF box - size and name included - based on its name.
 * `null` if not found.
 * @param {Uint8Array} buf - the isobmff data
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 byte integer
 * generated from encoding the corresponding ASCII in big endian.
 * @returns {UInt8Array|null}
 */
declare function getBox(buf: Uint8Array, boxName: number): Uint8Array | null;
/**
 * Returns byte offsets for the start of the box, the start of its content and
 * the end of the box (not inclusive).
 *
 * `null` if not found.
 *
 * If found, the tuple returned has three elements, all numbers:
 *   1. The starting byte corresponding to the start of the box (from its size)
 *   2. The beginning of the box content - meaning the first byte after the
 *      size and the name of the box.
 *   3. The first byte after the end of the box, might be equal to `buf`'s
 *      length if we're considering the last box.
 * @param {Uint8Array} buf - the isobmff data
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 byte integer
 * generated from encoding the corresponding ASCII in big endian.
 * @returns {Array.<number>|null}
 */
declare function getBoxOffsets(buf: Uint8Array, boxName: number): [
    number,
    number,
    number
] | null;
/**
 * Gives the content of a specific UUID box.
 * `undefined` if that box is not found.
 *
 * If found, the returned Uint8Array contains just the box's content: the box
 * without its name and size.
 * @param {Uint8Array} buf
 * @param {Number} id1
 * @param {Number} id2
 * @param {Number} id3
 * @param {Number} id4
 * @returns {Uint8Array|undefined}
 */
declare function getUuidContent(buf: Uint8Array, id1: number, id2: number, id3: number, id4: number): Uint8Array | undefined;
/**
 * For the next encountered box, return byte offsets corresponding to:
 *   1. the starting byte offset for the next box (should always be equal to
 *       `0`).
 *   2. The beginning of the box content - meaning the first byte after the
 *      size and the name of the box.
 *   3. The first byte after the end of the box, might be equal to `buf`'s
 *      length if we're considering the last box.
 *
 * `null` if no box is found.
 * @param {Uint8Array} buf - the isobmff data
 * @param {Number} boxName - the 4-letter 'name' of the box as a 4 byte integer
 * generated from encoding the corresponding ASCII in big endian.
 */
declare function getNextBoxOffsets(buf: Uint8Array): [
    0,
    number,
    number
] | null;
export { getBox, getBoxContent, getBoxesContent, getBoxOffsets, getChildBox, getNextBoxOffsets, getUuidContent, };
