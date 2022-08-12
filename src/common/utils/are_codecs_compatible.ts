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
  const [mimeTypeA, ...propsA] = a.split(";");
  const [mimeTypeB, ...propsB] = b.split(";");

  if (mimeTypeA !== mimeTypeB) {
    return false;
  }

  const codecsA = arrayFind(propsA, (prop) => startsWith(prop, "codecs="));
  const codecsB = arrayFind(propsB, (prop) => startsWith(prop, "codecs="));
  if (codecsA === undefined || codecsB === undefined) {
    return false;
  }

  const codecA = codecsA.substring(7);
  const codecB = codecsB.substring(7);
  if (codecA.split(".")[0] !== codecB.split(".")[0]) {
    return false;
  }

  return true;
}

export default areCodecsCompatible;
