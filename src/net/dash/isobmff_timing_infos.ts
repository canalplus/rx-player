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

import assert from "../../utils/assert";
import {
  parseTfdt,
  getDurationFromTrun,
} from "../../parsers/containers/isobmff";
import Segment from "../../manifest/segment";
import { ISegmentTimingInfos } from "../types";
import { ISidxSegment } from "../../parsers/containers/isobmff";

/**
 * Get precize start and duration of a segment from ISOBMFF.
 *   1. get start from tfdt
 *   2. get duration from trun
 *   3. if at least one is missing, get both informations from sidx
 *   4. As a fallback take segment infos.
 * @param {Segment} segment
 * @param {UInt8Array} buffer - The entire isobmff container
 * @param {Array.<Object>} [sidxSegments=[]] - Segments from sidx. Here
 * pre-parsed for performance reasons as it is usually available when
 * this function is called.
 * @param {Object} initInfos
 * @returns {Object}
 */
function getISOBMFFTimingInfos(
  segment : Segment,
  buffer : Uint8Array,
  sidxSegments : ISidxSegment[]|null,
  initInfos? : ISegmentTimingInfos
) : ISegmentTimingInfos {
  if (!sidxSegments) {
    sidxSegments = [];
  }
  let startTime;
  let duration;

  const decodeTime = parseTfdt(buffer);
  const trunDuration = getDurationFromTrun(buffer);

  const timescale = initInfos && initInfos.timescale ?
    initInfos.timescale : segment.timescale;

  // we could always make a mistake when reading a container.
  // If the estimate is too far from what the segment seems to imply, take
  // the segment infos instead.
  let maxDecodeTimeDelta : number;

  // Scaled start time and duration as announced in the segment data
  let segmentDuration : number|undefined;
  let segmentStart : number|undefined;

  if (timescale === segment.timescale) {
    maxDecodeTimeDelta = Math.min(
      0.9 * timescale,
      segment.duration != null ? segment.duration / 4 : 0.25
    );
    segmentStart = segment.time;
    segmentDuration = segment.duration;
  } else {
    maxDecodeTimeDelta = Math.min(
      0.9 * timescale,
      segment.duration != null ?
        ((segment.duration / segment.timescale) * timescale) / 4 : 0.25
    );
    segmentStart = ((segment.time || 0) / segment.timescale) * timescale;
    segmentDuration = segment.duration != null ?
      (segment.duration / segment.timescale) * timescale : undefined;
  }

  if (
    decodeTime >= 0 &&
    (
      segmentStart == null ||
      Math.abs(decodeTime - segmentStart) <= maxDecodeTimeDelta
    )
  ) {
    startTime = decodeTime;
  }

  if (
    trunDuration >= 0 &&
    (
      segmentDuration == null ||
      Math.abs(trunDuration - segmentDuration) <= maxDecodeTimeDelta
    )
  ) {
    duration = trunDuration;
  }

  if (startTime == null) {
    if (sidxSegments.length === 1) {
      const sidxStart = sidxSegments[0].time;
      if (
        sidxStart >= 0 &&
        (
          segmentStart == null ||
          Math.abs(segmentStart - sidxStart) <= maxDecodeTimeDelta
        )
      ) {
        const sidxTimescale = sidxSegments[0].timescale;
        if (sidxTimescale != null && sidxTimescale !== timescale) {
          startTime = (sidxStart / sidxTimescale) * timescale;
        } else {
          startTime = sidxStart;
        }
      } else {
        startTime = segmentStart;
      }
    } else {
      startTime = segmentStart;
    }
  }

  if (duration == null) {
    if (sidxSegments.length === 1) {
      const sidxDuration = sidxSegments[0].duration;
      if (
        sidxDuration >= 0 &&
        (
          segmentDuration == null ||
          Math.abs(segmentDuration - sidxDuration) <= maxDecodeTimeDelta
        )
      ) {
        const sidxTimescale = sidxSegments[0].timescale;
        if (sidxTimescale != null && sidxTimescale !== timescale) {
          duration = (sidxDuration / sidxTimescale) * timescale;
        } else {
          duration = sidxDuration;
        }
      } else {
        duration = segmentDuration;
      }
    } else {
      duration = segmentDuration;
    }
  }

  if (__DEV__) {
    assert(startTime != null);
    assert(duration != null);
  }

  return {
    timescale,
    time: startTime || 0,
    duration: duration || 0,
  };
}

export default getISOBMFFTimingInfos;
