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

export default areCodecsCompatible;
