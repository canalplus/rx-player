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

import config from "../../../config";
import { Adaptation } from "../../../manifest";

const { BUFFER_PADDING } = config;

/**
 * Get safety padding or the size of buffer that won't be flushed when
 * switching representation for smooth transitions and avoiding buffer underflows.
 *
 * @param {Object} adaptation
 * @returns {number}
 */
export default function getBufferPadding(
  adaptation : Adaptation
) : number {
  switch (adaptation.type) {
    case "audio":
    case "video":
      return BUFFER_PADDING[adaptation.type];
    default:
      return BUFFER_PADDING.other;
  }
}
