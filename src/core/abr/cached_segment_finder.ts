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
 * Returns a function used to determine if a segment was loaded
 * from cache or not.
 * Calling this function create a fresh memory of previous downloaded
 * durations. It shall be called at each representation change,
 * to memorize only the durations associated with one representation.
 * @returns {function}
 */
export default function generateCachedSegmentFinder(): (
  content: { representation: Representation;
             adaptation: Adaptation;
             segment: ISegment; },
  duration: number
) => undefined|boolean {
  const previousDownloadDurations: { video: number|undefined;
                                     audio: number|undefined; } = { video: undefined,
                                                                    audio: undefined };

  /**
   * Determines with request duration if a loaded chunk may have been loaded
   * from cache
   * @param {Object} content
   * @param {number} duration
   * @returns {undefined|boolean}
   */
  return function segmentMayBeFromCache(content: { representation: Representation;
                                                   adaptation: Adaptation;
                                                   segment: ISegment; },
                                        downloadDuration: number): undefined|boolean {
    const contentType = content.adaptation.type;
    if (contentType === "text" || contentType === "image") {
      return undefined;
    }

    const [ isFromCacheMaxDuration,
            canBeFromCacheMaxDuration ] =
      CACHE_LOAD_DURATION_THRESHOLDS[contentType];

    const  previousDownloadDuration =
      previousDownloadDurations[contentType];
    if (downloadDuration > canBeFromCacheMaxDuration ||
        (
          downloadDuration > isFromCacheMaxDuration &&
          previousDownloadDuration !== undefined &&
          previousDownloadDuration > isFromCacheMaxDuration
        )
    ) {
      previousDownloadDurations[contentType] = undefined;
      return false;
    }
    previousDownloadDurations[contentType] = downloadDuration;
    return true;
  };
}
