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

/* tslint:disable max-line-length */
/**
 * Convert Base64 string to Uint8Array.
 * Largely taken from:
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
 * Tried hard to understand it but nope.
 * Still seems to work though!
 * @param {string} sBase64
 * @returns {Uint8Array}
 */
/* tslint:enable max-line-length */
export default function base64ToUint8Array(sBase64 : string) : Uint8Array {
  // remove invalid base64 characters
  const base64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, "");
  const len = base64Enc.length;
  const outputLength = len * 3 + 1 >>> 2;
  const output = new Uint8Array(outputLength);
  for (let nMod3,
           nMod4,
           nUint24 = 0,
           nOutIdx = 0,
           idx = 0;
       idx < len;
       idx++)
  {
    nMod4 = idx & 3;
    nUint24 |= b64ToUint6(base64Enc.charCodeAt(idx)) << 18 - nMod4 * 6;
    if (nMod4 === 3 || len - idx === 1) {
      for (nMod3 = 0; nMod3 < 3 && nOutIdx < outputLength; nMod3++, nOutIdx++) {
        output[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
      }
      nUint24 = 0;
    }
  }
  return output;
}

/**
 * Don't ask.
 * @param {number} nChr
 * @returns {number}
 */
function b64ToUint6(nChr : number) : number {
  return nChr > 64 && nChr < 91 ? nChr - 65 :
         nChr > 96 && nChr < 123 ? nChr - 71 :
         nChr > 47 && nChr < 58 ? nChr + 4 :
         nChr === 43 ? 62 :
         nChr === 47 ? 63 :
         0;
}
