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

import config from "../config";
import { isEdgeChromium } from "./browser_detection";

/**
 * This functions tells if the RxPlayer can trust the browser when it has
 * successfully granted the MediaKeySystemAccess with
 * `navigator.requestMediaKeySystemAccess(keySystem)` function, or if it should do
 * some additional testing to confirm that the `keySystem` is supported on the device.
 *
 * This behavior has been experienced on the following device:
 *
 * On a Microsoft Surface with Edge v.124:
 * - Althought `requestMediaKeySystemAccess` resolve correctly with the keySystem
 *   "com.microsoft.playready.recommendation.3000", generating a request with
 *   `generateRequest` throws an error: "NotSupportedError: Failed to execute
 *   'generateRequest' on 'MediaKeySession': Failed to create MF PR CdmSession".
 *   In this particular case, the work-around was to consider recommendation.3000 as not supported
 *   and try another keySystem.
 * @param keySystem - The key system in use.
 * @returns {boolean}
 */
export function canRelyOnRequestMediaKeySystemAccess(keySystem: string): boolean {
  const { FORCE_CANNOT_RELY_ON_REQUEST_MEDIA_KEY_SYSTEM_ACCESS } = config.getCurrent();
  if (FORCE_CANNOT_RELY_ON_REQUEST_MEDIA_KEY_SYSTEM_ACCESS) {
    return false;
  }
  if (isEdgeChromium && keySystem.indexOf("playready") !== -1) {
    return false;
  }
  return true;
}
