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

import config from "../../config";
import {
  Adaptation,
  ISegment,
  Representation,
} from "../../manifest";

const { CACHE_LOAD_DURATION_THRESHOLDS } = config;

/**
 * From segment download duration, tells if a segment
 * may have been loaded from cache.
 * @param {string} contentType
 * @param {number} downloadDuration
 */
function mayBeFromCache(contentType: "audio"|"video",
                        downloadDuration: number): boolean {
  const cacheLoadDurationThreshold =
    CACHE_LOAD_DURATION_THRESHOLDS[contentType];

  return downloadDuration < cacheLoadDurationThreshold;
}

/**
 * Returns a function used to determine if a segment was loaded
 * from cache or not.
 * @returns {function}
 */
export default function generateCachedSegmentDetector():
  (content: { representation: Representation;
               adaptation: Adaptation;
               segment: ISegment; },
   duration: number) => boolean
{
  let hasAlreadyLoadedNonCachedContent = false;

  /**
   * Determines with request duration if a loaded chunk may have been loaded
   * from cache, and return true if should ignore the metrics for representation
   * chooser.
   * @param {Object} content
   * @param {number} duration
   * @returns {boolean}
   */
  return function shouldIgnoreMetrics(content: { representation: Representation;
                                                   adaptation: Adaptation;
                                                   segment: ISegment; },
                                      downloadDuration: number): boolean {
    const contentType = content.adaptation.type;
    if (contentType === "text" || contentType === "image") {
      return false;
    }

    const segmentMayBeFromCache = mayBeFromCache(contentType, downloadDuration);

    if (segmentMayBeFromCache && hasAlreadyLoadedNonCachedContent) {
      // We already loaded not cached segments.
      // Do not consider cached segments anymore.
      return true;
    }
    if (!segmentMayBeFromCache && !hasAlreadyLoadedNonCachedContent) {
      // First segment not loaded from cache.
      hasAlreadyLoadedNonCachedContent = true;
    }
    return false;
  };
}
