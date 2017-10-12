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
 * Creates a new string from the given array of char codes.
 *
 * @param {Uint8Array} args
 * @returns {string}
 */
function stringFromCharCode(args : Uint8Array) : string {
  const max = 16000;
  let ret = "";
  for (let i = 0; i < args.length; i += max) {
    const subArray = args.subarray(i, i + max);
    ret += String.fromCharCode.apply(null, subArray);
  }
  return ret;
}

/**
 * Creates a string from the given buffer as UTF-8 encoding.
 * @param {BufferSource} [data]
 * @returns {string}
 * @throws {Error}
 * @export
 */
function stringFromUTF8(data? : Uint8Array|null) : string {
  if (!data) {
    return "";
  }

  let uint8 = new Uint8Array(data);

  // If present, strip off the UTF-8 BOM.
  if (uint8[0] === 0xef && uint8[1] === 0xbb && uint8[2] === 0xbf) {
    uint8 = uint8.subarray(3);
  }

  // http://stackoverflow.com/a/13691499
  const utf8 = stringFromCharCode(uint8);

  // This converts each character in the string to an escape sequence.  If the
  // character is in the ASCII range, it is not converted; otherwise it is
  // converted to a URI escape sequence.
  // Example: "\x67\x35\xe3\x82\xac" -> "g#%E3%82%AC"
  // TODO "escape" is deprecated, provide a ponyfill?
  const escaped = escape(utf8);

  // Decode the escaped sequence.  This will interpret UTF-8 sequences into the
  // correct character.
  // Example: "g#%E3%82%AC" -> "g#€"
  return decodeURIComponent(escaped);
}

export {
  stringFromCharCode,
  stringFromUTF8,
};
