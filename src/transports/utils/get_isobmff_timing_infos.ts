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

import log from "../../log";
import { ISegment } from "../../manifest";
import {
  getDurationFromTrun,
  getTrackFragmentDecodeTime,
} from "../../parsers/containers/isobmff";
import { IChunkTimeInfo } from "../types";

/**
 * Get precize start and duration of a chunk.
 * @param {UInt8Array} buffer - An ISOBMFF container (at least a `moof` + a
 * `mdat` box.
 * @param {Boolean} isChunked - If true, the whole segment was chunked into
 * multiple parts and buffer is one of them. If false, buffer is the whole
 * segment.
 * @param {Object} segment
 * @param {number|undefined} initTimescale
 * @returns {Object}
 */
export default function getISOBMFFTimingInfos(
  buffer : Uint8Array,
  isChunked : boolean,
  segment : ISegment,
  initTimescale? : number
) : IChunkTimeInfo | null {
  const baseDecodeTime = getTrackFragmentDecodeTime(buffer);
  if (baseDecodeTime === undefined || initTimescale === undefined) {
    return null;
  }

  let startTime = segment.timestampOffset !== undefined ?
                    baseDecodeTime + (segment.timestampOffset * initTimescale) :
                    baseDecodeTime;
  let trunDuration = getDurationFromTrun(buffer);
  if (startTime < 0) {
    if (trunDuration !== undefined) {
      trunDuration += startTime; // remove from duration what comes before `0`
    }
    startTime = 0;
  }

  if (isChunked || !segment.complete) {
    if (trunDuration === undefined) {
      log.warn("DASH: Chunked segments should indicate a duration through their" +
               " trun boxes");
    }
    return { time: startTime / initTimescale,
             duration: trunDuration !== undefined ? trunDuration / initTimescale :
                                                    undefined };
  }

  let duration : number | undefined;
  const segmentDuration = segment.duration * initTimescale;

  // we could always make a mistake when reading a container.
  // If the estimate is too far from what the segment seems to imply, take
  // the segment infos instead.
  const maxDecodeTimeDelta = Math.min(initTimescale * 0.9,
                                      segmentDuration / 4);

  if (trunDuration !== undefined &&
      Math.abs(trunDuration - segmentDuration) <= maxDecodeTimeDelta)
  {
    duration = trunDuration;
  }

  return { time: startTime / initTimescale,
           duration: duration !== undefined ? duration / initTimescale :
                                              duration };
}
