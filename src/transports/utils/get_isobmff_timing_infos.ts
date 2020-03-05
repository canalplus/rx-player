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

import { ISegment } from "../../manifest";
import {
  getDurationFromTrun,
  getTrackFragmentDecodeTime,
} from "../../parsers/containers/isobmff";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import { IChunkTimingInfos } from "../types";

/**
 * Get precize start and duration of a chunk.
 * @param {UInt8Array} buffer - An ISOBMFF container (at least a `moof` + a
 * `mdat` box.
 * @param {Boolean} isChunked - If true, the whole segment was chunked into
 * multiple parts and buffer is one of them. If false, buffer is the whole
 * segment.
 * @param {Object} segment
 * @param {Array.<Object>|undefined} sidxSegments - Segments from sidx. Here
 * pre-parsed for performance reasons as it is usually available when
 * this function is called.
 * @param {number|undefined} initTimescale
 * @returns {Object}
 */
export default function getISOBMFFTimingInfos(
  buffer : Uint8Array,
  isChunked : boolean,
  segment : ISegment,
  initTimescale? : number
) : IChunkTimingInfos | null {
  let startTime;
  let duration;
  const trunDuration = getDurationFromTrun(buffer);
  const timescale = initTimescale ?? segment.timescale;

  const baseDecodeTime = getTrackFragmentDecodeTime(buffer);
  if (isChunked) { // when chunked, no mean to know the duration for now
    if (initTimescale === undefined) {
      return null;
    }
    if (baseDecodeTime < 0) {
      return null;
    }
    return { time: baseDecodeTime,
             duration: trunDuration >= 0 ? trunDuration :
                                           undefined,
             timescale: initTimescale };
  }

  // we could always make a mistake when reading a container.
  // If the estimate is too far from what the segment seems to imply, take
  // the segment infos instead.
  let maxDecodeTimeDelta : number;

  // Scaled start time and duration as announced in the segment data
  let segmentDuration : number|undefined;

  if (timescale === segment.timescale) {
    maxDecodeTimeDelta = Math.min(timescale * 0.9,
                                  !isNullOrUndefined(segment.duration) ?
                                    segment.duration / 4 :
                                    0.25);
    segmentDuration = segment.duration;
  } else {
    maxDecodeTimeDelta =
      Math.min(timescale * 0.9,
               !isNullOrUndefined(segment.duration) ?
                 ((segment.duration / segment.timescale) * timescale) / 4 :
                   0.25
    );
    segmentDuration = !isNullOrUndefined(segment.duration) ?
                        (segment.duration / segment.timescale) * timescale :
                        undefined;
  }

  if (baseDecodeTime >= 0) {
    startTime = segment.timestampOffset !== undefined ?
                  baseDecodeTime + (segment.timestampOffset * timescale) :
                  baseDecodeTime;
  } else {
    return null;
  }

  if (trunDuration >= 0 &&
      (
        segmentDuration === undefined ||
        Math.abs(trunDuration - segmentDuration) <= maxDecodeTimeDelta
      ))
  {
    duration = trunDuration;
  }

  return { timescale, time: startTime, duration };
}
