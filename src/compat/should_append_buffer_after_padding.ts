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

import {
  isSafari,
  isTizen,
} from "./browser_detection";

/**
 * When the player decides to load another quality and replace
 * currently buffered one, it may append buffer on current playback time.
 *
 * On Safari, with HSS contents, this provoques green macro-block screens
 * during the transition. To avoid this situation, we decide not to load a
 * segment if it may be pushed during playback time. We should not buffer
 * under a certain padding from the current time.
 */
const shouldAppendBufferAfterPadding = isSafari || isTizen;
export default shouldAppendBufferAfterPadding;
