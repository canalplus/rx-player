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

import { MediaError } from "../../../errors";
import Manifest, {
  LoadedPeriod,
  PartialPeriod,
} from "../../../manifest";

/**
 * Get the period for a given time and throw the right error if none is found.
 * @param {Object} manifest
 * @param {number} time
 * @returns {Object}
 */
export default function getPeriodForTime(
  manifest : Manifest,
  time : number
) : LoadedPeriod | PartialPeriod {
  const wantedPeriod = manifest.getPeriodForTime(time);
  if (wantedPeriod === undefined) {
    throw new MediaError("MEDIA_TIME_NOT_FOUND",
      "The wanted position is not found in the Manifest.");
  }
  return wantedPeriod;
}
