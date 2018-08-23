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

import log from "../../../log";

function getLength(buffer : Uint8Array, offset : number) : number|undefined {
  for (let length = 1; length <= 8; length++) {
    if (buffer[offset] >= Math.pow(2, 8 - length)) {
      return length;
    }
  }
  return undefined;
}

export function getEBMLID(
  buffer : Uint8Array,
  offset : number
) : { length : number; value : number }|null {
  const length = getLength(buffer, offset);
  if (length == null) {
    log.warn("webm: unrepresentable length");
    return null;
  }
  if (offset + length > buffer.length) {
    log.warn("webm: impossible length");
    return null;
  }

  let value = 0;
  for (let i = 0; i < length; i++) {
    value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
  }
  return { length, value };
}

export function getEBMLValue(
  buffer : Uint8Array,
  offset : number
) : { length : number; value : number }|null {
  const length = getLength(buffer, offset);
  if (length == null) {
    log.warn("webm: unrepresentable length");
    return null;
  }
  if (offset + length > buffer.length) {
    log.warn("webm: impossible length");
    return null;
  }

  let value = (buffer[offset] & (1 << (8 - length)) - 1) *
    Math.pow(2, (length - 1) * 8);
  for (let i = 1; i < length; i++) {
    value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
  }
  return { length, value };
}

/**
 * Convert a IEEE754 32 bits floating number as an Uint8Array into its
 * corresponding Number.
 * @param {Uint8Array} buffer
 * @param {number} offset
 * @returns {number}
 */
export function get_IEEE754_32Bits(
  buffer : Uint8Array,
  offset : number
) {
  return new DataView(buffer.buffer).getFloat32(offset);
}

/**
 * Convert a IEEE754 64 bits floating number as an Uint8Array into its
 * corresponding Number.
 * @param {Uint8Array} buffer
 * @param {number} offset
 * @returns {number}
 */
export function get_IEEE754_64Bits(
  buffer : Uint8Array,
  offset : number
) : number {
  return new DataView(buffer.buffer).getFloat64(offset);
}

export function bytesToNumber(
  buffer : Uint8Array,
  offset : number,
  length : number
) : number {
  let value = 0;
  for (let i = 0; i < length; i++) {
    value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
  }
  return value;
}
