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
import SegmentBookkeeper from "../segment_bookkeeper";
import { IWaitingSegmentCache } from "./representation_buffer";
import arrayFind from "../../../utils/array_find";

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
  currentSegmentRequest: null | { segment: ISegment },
  waitingSegmentCache : IWaitingSegmentCache
) : boolean {
  const {
    period,
    adaptation,
    representation,
  } = content;

  if (waitingSegmentCache[segment.id] &&
      (
        currentSegmentRequest == null ||
        currentSegmentRequest.segment.id !== segment.id
      )
    ) {
    const isWaitingForBuffering = arrayFind(waitingSegmentCache[segment.id].chunks, ([_, status]) => {
      return status !== "appended";
    });

    // If a segment is being bufferized and it is not loaded anymore,
    // we should ask for download
    if (isWaitingForBuffering) {
      return false;
    }
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

  if (!currentSegment ||
    !currentSegment.isComplete
     ) {
    return true;
  }

  if (currentSegment.infos.period.id !== period.id) {
    // segments for later periods have the advantage here
    return period.start >= currentSegment.infos.period.start;
  }

  if (currentSegment.infos.adaptation.id !== adaptation.id) {
    return true;
  }

  // only re-load comparatively-poor bitrates for the same adaptation.
  const bitrateCeil = currentSegment.infos.representation.bitrate *
                      BITRATE_REBUFFERING_RATIO;

  return representation.bitrate > bitrateCeil;
}
