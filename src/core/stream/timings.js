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
  seekingsSampler,
  getMaximumSecureBufferPosition,
} from "../timings";

/**
 * Create timings and seekings Observables:
 *   - timings is the given timings observable with added informations.
 *   - seekings emits each time the player go in a seeking state.
 * @param {Object} manifest
 * @returns {Object}
 */
export default function createTimingsAndSeekingsObservables(
  manifest,
  timings,
  fragEndTimeIsFinite,
  timeFragment
) {
  const augmentedTimings = timings.map((timing) => {
    let clonedTiming;
    if (fragEndTimeIsFinite) {
      clonedTiming = timing.clone();
      clonedTiming.ts = Math.min(timing.ts, timeFragment.end);
      clonedTiming.duration = Math.min(timing.duration, timeFragment.end);
    } else {
      clonedTiming = timing;
    }

    clonedTiming.liveGap = manifest.isLive ?
      getMaximumSecureBufferPosition(manifest) - timing.ts :
      Infinity;
    return clonedTiming;
  });

  const seekings = seekingsSampler(augmentedTimings);

  return {
    timings: augmentedTimings,
    seekings,
  };
}
