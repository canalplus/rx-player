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

import log from "../../utils/log";
import { getDurationFromTrun } from "../../parsers/isobmff.js";
import mp4Utils from "./mp4.js";

const {
  getTraf,
  parseTfrf,
  parseTfxd,
} = mp4Utils;

function extractTimingsInfos(responseData, segment, isLive) {
  let nextSegments;
  let segmentInfos;

  if (isLive) {
    const traf = getTraf(responseData);
    if (traf) {
      nextSegments = parseTfrf(traf);
      segmentInfos = parseTfxd(traf);
    } else {
      log.warn("smooth: could not find traf atom");
    }
  } else {
    nextSegments = null;
  }

  if (!segmentInfos) {
    // we could always make a mistake when reading a container.
    // If the estimate is too far from what the segment seems to imply, take
    // the segment infos instead.
    const maxDecodeTimeDelta = Math.min(
      0.9 * segment.timescale,
      segment.duration / 4
    );

    const trunDuration = getDurationFromTrun(responseData);
    if (
      trunDuration >= 0 &&
      Math.abs(trunDuration - segment.duration) <= maxDecodeTimeDelta
    ) {
      segmentInfos = {
        time: segment.time,
        duration: trunDuration,
      };
    } else {
      segmentInfos = {
        time: segment.time,
        duration: segment.duration,
      };
    }
  }

  if (nextSegments) {
    for (let i = nextSegments.length - 1; i >= 0; i--) {
      nextSegments[i].timescale = segment.timescale;
    }
  }

  if (segmentInfos){
    segmentInfos.timescale = segment.timescale;
  }
  return { nextSegments, segmentInfos };
}

export default extractTimingsInfos;
