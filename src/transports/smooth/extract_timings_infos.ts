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
  getTRAF,
} from "../../parsers/containers/isobmff";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import { IChunkTimeInfo } from "../types";
import {
  IISOBMFFBasicSegment,
  parseTfrf,
  parseTfxd,
} from "./isobmff";

/** Information on future segments. */
export interface INextSegmentsInfos {
  /**
   * Difference between the latest and the earliest presentation time
   * available in that segment. The unit is in the corresponding timescale (see
   * `timescale` property).
   */
  duration : number;
  /**
   * Earliest presentation time available in that segment.
   * The unit is in the corresponding timescale (see `timescale` property).
   */
  time : number;
  /**
   * Allow to convert `duration` and `time` into seconds by dividing them to
   * that value.
   * e.g.:
   *   timeInSeconds = time / timescale
   *   durationInSeconds = duration / timescale
   *
   * Expressing those values relative to a "timescale" allows a greater
   * precision for the `time` and `duration` values.
   */
  timescale : number; // time unit for seconds conversion.
}

/**
 * Try to obtain time information from the given data.
 * @param {Uint8Array} data
 * @param {boolean} isChunked
 * @param {Object} segment
 * @param {boolean} isLive
 * @returns {Object}
 */
export default function extractTimingsInfos(
  data : Uint8Array,
  isChunked : boolean,
  segment : ISegment,
  isLive : boolean
) : { nextSegments : INextSegmentsInfos[];
      chunkInfos : IChunkTimeInfo | null; }
{
  const nextSegments : INextSegmentsInfos[] = [];
  let chunkInfos : IChunkTimeInfo;

  let tfxdSegment : IISOBMFFBasicSegment|undefined;
  let tfrfSegments : IISOBMFFBasicSegment[]|undefined;
  if (isLive) {
    const traf = getTRAF(data);
    if (traf !== null) {
      tfrfSegments = parseTfrf(traf);
      tfxdSegment = parseTfxd(traf);
    } else {
      log.warn("smooth: could not find traf atom");
    }
  }

  if (tfrfSegments !== undefined) {
    for (let i = 0; i < tfrfSegments.length; i++) {
      nextSegments.push({ time: tfrfSegments[i].time,
                          duration: tfrfSegments[i].duration,
                          timescale: segment.timescale });
    }
  }

  if (tfxdSegment !== undefined) {
    chunkInfos = { time: tfxdSegment.time,
                   duration: tfxdSegment.duration,
                   timescale: segment.timescale };
    return { nextSegments, chunkInfos };
  }

  if (isChunked) {
    return { nextSegments, chunkInfos: null };
  }

  // we could always make a mistake when reading a container.
  // If the estimate is too far from what the segment seems to imply, take
  // the segment infos instead.
  const maxDecodeTimeDelta = Math.min(segment.timescale * 0.9,
                                      segment.duration / 4);

  const trunDuration = getDurationFromTrun(data);
  if (trunDuration !== undefined && (isNullOrUndefined(segment.duration) ||
      Math.abs(trunDuration - segment.duration) <= maxDecodeTimeDelta)
  ) {
    chunkInfos = { time: segment.time,
                   duration: trunDuration,
                   timescale: segment.timescale };
  } else {
    chunkInfos = { time: segment.time,
                   duration: segment.duration,
                   timescale: segment.timescale };
  }
  return { nextSegments, chunkInfos };
}
