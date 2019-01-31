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

import { isFirefox } from "./browser_detection";

/**
 * Cues need to be removed from current text track when no adaptation is set.
 *
 * In latests version of Firefox, text tracks are still shown even if cues were
 * removed from the track. In that specific case, source buffer can be disposed
 * as a workaround.
 *
 * The function returns weither the source buffer should be disposed or not.
 * @param {string} bufferType
 * @returns {boolean}
 */
export default function shouldDisposeSourceBuffer(bufferType: string): boolean {
  return bufferType === "text" && isFirefox;
}
