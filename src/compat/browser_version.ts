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

import log from "../log";
import { isFirefox } from "./browser_detection";

/**
 * Returns either :
 * - 'null' when the current browser is not Firefox.
 * - '-1' when it is impossible to get the Firefox version
 * - A number above 0 that is the Firefox version number
 * @returns {number|null}
 */
function getFirefoxVersion(): number | null {
  if (!isFirefox) {
    log.warn("Compat: Can't access Firefox version on no firefox browser.");
    return null;
  }
  const userAgent = navigator.userAgent;
  const match = /Firefox\/([0-9]+)\./.exec(userAgent);
  if (match === null) {
    return -1;
  }
  const result = parseInt(match[1], 10);
  if (isNaN(result)) {
    return -1;
  }
  return result;
}

export { getFirefoxVersion };
