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

import Manifest from "../../../manifest";
import { IContentInfos } from "./types";

/**
 * From a given time, find the trickmode representation and return
 * the content information.
 * @param {number} time
 * @param {Object} manifest
 * @returns {Object|null}
 */
export default function getContentInfos(
  time: number,
  manifest: Manifest
): IContentInfos|null {
  const period = manifest.getPeriodForTime(time);
  if (period === undefined ||
      period.adaptations.video === undefined ||
      period.adaptations.video.length === 0) {
    return null;
  }
  for (let i = 0; i < period.adaptations.video.length; i++) {
    const videoAdaptation = period.adaptations.video[i];
    if (videoAdaptation.trickModeTracks !== undefined &&
        videoAdaptation.trickModeTracks[0] !== undefined &&
        videoAdaptation.trickModeTracks[0].representations[0] !== undefined) {
      const representation = videoAdaptation.trickModeTracks[0].representations[0];
      return { manifest,
               period,
               adaptation: videoAdaptation,
               representation };
    }
  }
  return null;
}
