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

import { isSafariMobile } from "./browser_detection";

/**
 * On some browsers, the ready state might never go above `1` when autoplay is
 * blocked. On these cases, for now, we just advertise the content as "loaded".
 * We might go into BUFFERING just after that state, but that's a small price to
 * pay.
 * @param {Boolean} isDirectfile
 * @returns {Boolean}
 */
export default function shouldWaitForDataBeforeLoaded(
  isDirectfile: boolean,
  mustPlayInline: boolean
): boolean {
  if (isDirectfile && isSafariMobile) {
    return mustPlayInline;
  }
  return true;
}
