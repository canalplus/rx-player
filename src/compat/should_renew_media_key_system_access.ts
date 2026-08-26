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

import config from "../config.ts";
import EnvDetector from "./env_detector.ts";

/**
 * Returns true if the current target require the MediaKeySystemAccess to be
 * renewed on each content.
 * On PlayStation 5 and PS4:
 * When trying to close a mediaKeySession with sessionType "persistent-license",
 * the device is not able to close the session (InvalidStateError).
 * This mean we are not able to close sessions and therefore once we reach the limit
 * of sessions available on the device we cannot create new ones.
 * The solution we found is to renew the mediaKeySystemAccess to make the MediaKeys
 * unavailable, the browser will close by it's own the MediaKeySessions associated
 * with that MediaKeys.
 * Notice that we tried to only renew the MediaKeys with
 * `keySystemAccess.createMediaKeys()`, but the device throw a "Permission Denied" error
 * when creating too many mediaKeys.
 * @returns {Boolean}
 */
export default function shouldRenewMediaKeySystemAccess(keySystem: string): boolean {
  const { FORCE_SHOULD_RENEW_MEDIA_KEY_SYSTEM_ACCESS } = config.getCurrent();
  if (FORCE_SHOULD_RENEW_MEDIA_KEY_SYSTEM_ACCESS) {
    return true;
  }
  return (
    (keySystem.indexOf("playready") !== -1 &&
      (EnvDetector.browser === EnvDetector.BROWSERS.Ie11 ||
        EnvDetector.browser === EnvDetector.BROWSERS.EdgeChromium ||
        EnvDetector.browser === EnvDetector.BROWSERS.Firefox)) ||
    EnvDetector.device === EnvDetector.DEVICES.PlayStation5 ||
    EnvDetector.device === EnvDetector.DEVICES.PlayStation4
  );
}
