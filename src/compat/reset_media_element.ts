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
import type { IMediaElement } from "./browser_compatibility_types";
import clearElementSrc from "./clear_element_src";

/**
 * Dispose of ressources taken by the MediaSource:
 *   - Clear the MediaSource' SourceBuffers
 *   - Clear the mediaElement's src (stop the mediaElement)
 *   - Revoke MediaSource' URL
 * @param {HTMLMediaElement} mediaElement
 * @param {string|null} mediaSourceURL
 */
export default function resetMediaElement(
  mediaElement: IMediaElement,
  mediaSourceURL: string | null,
): void {
  if (mediaSourceURL !== null && mediaElement.src === mediaSourceURL) {
    log.info("media", "Clearing HTMLMediaElement's src");
    clearElementSrc(mediaElement);
  }

  if (mediaSourceURL !== null) {
    try {
      log.debug("media", "Revoking previous URL");
      URL.revokeObjectURL(mediaSourceURL);
    } catch (e) {
      log.warn(
        "media",
        "Error while revoking the media source URL",
        e instanceof Error ? e : "",
      );
    }
  }
}
