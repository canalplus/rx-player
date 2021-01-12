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
import { getFirefoxVersion } from "./browser_version";

/**
 * This functions tells if the RxPlayer can trust on any browser data
 * about video element visibility and size.
 *
 * On Firefox (version > 71) :
 * - There is no API to know if the Picture-in-picture (PIP) is enabled
 * - There is no API to get the width of the PIP window
 *
 * Thus, when the video element is displayed in picture-in-picture, the element
 * clientWidth still tells the width of the original video element, and no PIP
 * Window API exists to determine its presence or width. There are no way to
 * determine the real width of the video window, as we can't know when the PIP
 * is enabled, and we can't have access to its size information.
 *
 * Moreover, when the document is considered as hidden (e.g. in case of hidden
 * tab), as there is no way to know if the PIP is enabled, we can't know if
 * the video window is visible or not.
 * @returns {boolean}
 */
export default function canRelyOnVideoVisibilityAndSize(): boolean {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  if (!isFirefox) {
    return true;
  }
  const firefoxVersion = getFirefoxVersion();
  if (firefoxVersion === null || firefoxVersion < 71) {
    return true;
  }
  return (HTMLVideoElement as any)?.prototype?.requirePictureInPicture !== undefined;
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
}
