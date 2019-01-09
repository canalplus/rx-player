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
import SimpleSet from "../../../utils/simple_set";
import SegmentBookkeeper from "../segment_bookkeeper";

const {
  BITRATE_REBUFFERING_RATIO,
  MINIMUM_SEGMENT_SIZE,
} = config;

/**
 * Returns true if the given Segment should be downloaded.
 * false otherwise.
 *
 * @param {Object} segment
 * @param {Object} content - The content the Segment depends on.
 * @param {Object} segmentBookkeeper
 * @param {Object} wantedRange
 * @param {Object} segmentIDsToIgnore
 * @returns {boolean}
 */
export default function shouldDownloadSegment(
  segment : ISegment,
  content: {
    period : Period;
    adaptation : Adaptation;
    representation : Representation;
  },
  segmentBookkeeper: SegmentBookkeeper,
  wantedRange : { start : number; end : number },
  segmentIDsToIgnore : SimpleSet,
  lastStableBitrate? : number
) : boolean {
  const { period, adaptation, representation } = content;
  const shouldIgnore = segmentIDsToIgnore.test(segment.id);
  if (shouldIgnore) {
    return false;
  }

  // segment without time info are usually init segments or some
  // kind of metadata segment that we never filter out
  if (segment.isInit || segment.time < 0) {
    return true;
  }

  const { time, duration, timescale } = segment;
  if (!duration) {
    return true;
  }

  if (duration / timescale < MINIMUM_SEGMENT_SIZE) {
    return false;
  }

  const currentSegment =
    segmentBookkeeper.hasPlayableSegment(wantedRange, { time, duration, timescale });

  if (!currentSegment) {
    return true;
  }

  if (currentSegment.infos.period.id !== period.id) {
    // segments for later periods have the advantage here
    return period.start >= currentSegment.infos.period.start;
  }

  if (currentSegment.infos.adaptation.id !== adaptation.id) {
    return true;
  }

  if (lastStableBitrate == null) {
    // only re-load comparatively-poor bitrates for the same adaptation.
    const bitrateCeil = currentSegment.infos.representation.bitrate *
      BITRATE_REBUFFERING_RATIO;
    return representation.bitrate > bitrateCeil;
  }
  return currentSegment.infos.representation.bitrate < lastStableBitrate;
}
