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

import config from "../../../config";
import {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";

const { BITRATE_REBUFFERING_RATIO } = config;

export interface IContent { adaptation : Adaptation;
                            period : Period;
                            representation : Representation;
                            segment: ISegment; }

/**
 * @param {Object} currentContent
 * @param {Object} newContent
 * @param {number|undefined} fastSwitchingStep
 * @returns {boolean}
 */
export default function shouldReplaceSegment(
  currentContent : IContent,
  newContent : IContent,
  fastSwitchingStep? : number
) : boolean {
  if (currentContent.period.id !== newContent.period.id) {
    // segments for later periods have the advantage here
    return newContent.period.start >= currentContent.period.start;
  }

  if (currentContent.adaptation.id !== newContent.adaptation.id) {
    return true;
  }

  const currentSegmentBitrate = currentContent.representation.bitrate;

  if (fastSwitchingStep == null) {
    // only re-load comparatively-poor bitrates for the same Adaptation.
    const bitrateCeil = currentSegmentBitrate * BITRATE_REBUFFERING_RATIO;
    return newContent.representation.bitrate > bitrateCeil;
  }
  return currentSegmentBitrate < fastSwitchingStep;
}
