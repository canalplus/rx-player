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
import isNullOrUndefined from "../utils/is_null_or_undefined";
import isWorker from "../utils/is_worker";
import { MediaSource_ } from "./browser_compatibility_types";

/**
 * Setting this value limit the number of entries in the support map
 * preventing important memory usage, value is arbitrary
 */
const MAX_SUPPORT_MAP_ENTRIES = 200;

/**
 * caching the codec support reduce the amount of call to `isTypeSupported`
 * and help for performance especially on low-end devices.
 */
const supportMap: Map<string, boolean> = new Map();
/**
 * Returns true if the given codec is supported by the browser's MediaSource
 * implementation.
 * @param {string} mimeType - The MIME media type that you want to test support
 * for in the current browser.
 * This may include the codecs parameter to provide added details about the
 * codecs used within the file.
 * @returns {Boolean}
 */
export default function isCodecSupported(mimeType: string): boolean {
  if (isNullOrUndefined(MediaSource_)) {
    if (isWorker) {
      log.error("Compat: Cannot request codec support in a worker without MSE.");
    }
    return false;
  }

  /* eslint-disable @typescript-eslint/unbound-method */
  if (typeof MediaSource_.isTypeSupported === "function") {
    /* eslint-enable @typescript-eslint/unbound-method */
    const cachedSupport = supportMap.get(mimeType);
    if (cachedSupport !== undefined) {
      return cachedSupport;
    } else {
      const isSupported = MediaSource_.isTypeSupported(mimeType);
      if (supportMap.size >= MAX_SUPPORT_MAP_ENTRIES) {
        supportMap.clear();
      }
      supportMap.set(mimeType, isSupported);
      return isSupported;
    }
  }

  return true;
}
