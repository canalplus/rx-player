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

import type { ICodecSupportList } from "../manifest";
import arrayFind from "./array_find";
import startsWith from "./starts_with";

/**
 * This function is a shortcut that helps differentiate two codecs
 * of the form "audio/mp4;codecs=\"av1.40.2\"".
 *
 * @param codecA
 * @param codecB
 * @returns A boolean that tell whether or not those two codecs provided are even.
 */
function areCodecsCompatible(a: string, b: string): boolean {
  const { mimeType: mimeTypeA, codecs: codecsA } = parseCodec(a);
  const { mimeType: mimeTypeB, codecs: codecsB } = parseCodec(b);

  if (mimeTypeA !== mimeTypeB) {
    return false;
  }
  if (codecsA === "" || codecsB === "") {
    return false;
  }
  if (codecsA.split(".")[0] !== codecsB.split(".")[0]) {
    return false;
  }
  return true;
}

const LENGTH_OF_CODEC_PREFIX = "codecs=".length;

export function parseCodec(unparsedCodec: string): { mimeType: string; codecs: string } {
  const [mimeType, ...props] = unparsedCodec.split(";");
  let codecs = arrayFind(props, (prop) => startsWith(prop, "codecs=")) ?? "";
  // remove the 'codecs=' prefix
  codecs = codecs.substring(LENGTH_OF_CODEC_PREFIX);
  // remove the leading and trailing quote
  if (codecs[0] === '"') {
    codecs = codecs.substring(1, codecs.length - 2);
  }

  return { mimeType, codecs };
}

/**
 * Find the first codec in the provided codec list that is compatible with the given mimeType and codec.
 * This first codec is called the "compatible codec". Return true if the "compatible codec"
 * is supported or false if it's not supported. If no "compatible codec" has been found, return undefined.
 *
 * @param {string} mimeType - The MIME type to check.
 * @param {string} codec - The codec to check.
 * @param {Array} codecList - The list of codecs to check against.
 * @returns {boolean|undefined} - True if the "compatible codec" is supported, false if not,
 * or undefined if no "compatible codec" is found.
 */
export function isCompatibleCodecSupported(
  mimeType: string,
  codec: string,
  codecList: ICodecSupportList,
): boolean | undefined {
  const inputCodec = `${mimeType};codecs="${codec}"`;
  const sameMimeTypeCodec = codecList.filter((c) => c.mimeType === mimeType);
  if (sameMimeTypeCodec.length === 0) {
    // No codec with the same MIME type was found.
    return undefined;
  }

  for (const {
    codec: currentCodec,
    mimeType: currentMimeType,
    result,
  } of sameMimeTypeCodec) {
    const existingCodec = `${currentMimeType};codecs="${currentCodec}"`;
    if (areCodecsCompatible(inputCodec, existingCodec)) {
      return result;
    }
  }
  // No compatible codec was found.
  return undefined;
}

export default areCodecsCompatible;
