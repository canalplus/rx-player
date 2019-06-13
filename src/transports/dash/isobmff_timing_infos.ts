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
  ISidxSegment,
} from "../../parsers/containers/isobmff";
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
 * @param {Object|undefined} initInfos
 * @returns {Object}
 */
function getISOBMFFTimingInfos(
  buffer : Uint8Array,
  isChunked : boolean,
  segment : ISegment,
  sidxSegments : ISidxSegment[]|null,
  initInfos? : IChunkTimingInfos
) : IChunkTimingInfos | null {
  const _sidxSegments = sidxSegments || [];
  let startTime;
  let duration;

  const baseDecodeTime = getTrackFragmentDecodeTime(buffer);
  if (isChunked) { // when chunked, no mean to know the duration for now
    if (baseDecodeTime < 0 || initInfos == null) {
      return null;
    }
    return { time: baseDecodeTime,
             duration: undefined,
             timescale: initInfos.timescale };
  }

  const trunDuration = getDurationFromTrun(buffer);
  const timescale = initInfos && initInfos.timescale ? initInfos.timescale :
                                                       segment.timescale;

  // we could always make a mistake when reading a container.
  // If the estimate is too far from what the segment seems to imply, take
  // the segment infos instead.
  let maxDecodeTimeDelta : number;

  // Scaled start time and duration as announced in the segment data
  let segmentDuration : number|undefined;
  let segmentStart : number|undefined;

  if (timescale === segment.timescale) {
    maxDecodeTimeDelta = Math.min(timescale * 0.9,
                                  segment.duration != null ? segment.duration / 4 :
                                                             0.25);
    segmentStart = segment.time;
    segmentDuration = segment.duration;
  } else {
    maxDecodeTimeDelta =
      Math.min(timescale * 0.9,
               segment.duration != null ?
                 ((segment.duration / segment.timescale) * timescale) / 4 :
                   0.25
    );
    segmentStart = ((segment.time || 0) / segment.timescale) * timescale;
    segmentDuration = segment.duration != null ?
                        (segment.duration / segment.timescale) * timescale :
                        undefined;
  }

  if (baseDecodeTime >= 0) {
    startTime = segment.timestampOffset != null ?
                  baseDecodeTime + (segment.timestampOffset * timescale) :
                  baseDecodeTime;
  }

  if (trunDuration >= 0 &&
      (
        segmentDuration == null ||
        Math.abs(trunDuration - segmentDuration) <= maxDecodeTimeDelta
      ))
  {
    duration = trunDuration;
  }

  if (startTime == null) {
    if (_sidxSegments.length === 0) {
      startTime = segmentStart;
    } else {
      const sidxStart = _sidxSegments[0].time;
      if (sidxStart >= 0) {
        const sidxTimescale = _sidxSegments[0].timescale;
        const baseStartTime = sidxTimescale != null &&
                              sidxTimescale !== timescale ?
                                (sidxStart / sidxTimescale) * timescale :
                                sidxStart;
        startTime = segment.timestampOffset != null ?
                      baseStartTime + (segment.timestampOffset * timescale) :
                      baseStartTime;
      } else {
        startTime = segmentStart;
      }
    }
  }

  if (duration == null) {
    if (_sidxSegments.length) {
      const sidxDuration = _sidxSegments.reduce((a, b) => a + (b.duration || 0), 0);
      duration = sidxDuration >= 0 ? sidxDuration :
                                     segmentDuration;
    } else {
      duration = segmentDuration;
    }
  }

  return { timescale,
           time: startTime || 0,
           duration };
}

export default getISOBMFFTimingInfos;
