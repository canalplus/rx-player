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

import { Segment } from "../../manifest";
import { getDurationFromTrun } from "../../parsers/containers/isobmff";

import {
  INextSegmentsInfos,
  ISegmentTimingInfos,
} from "../types";

import mp4Utils, { IISOBMFFBasicSegment } from "./mp4";

const {
  getTraf,
  parseTfrf,
  parseTfxd,
} = mp4Utils;

function extractTimingsInfos(
  responseData : Uint8Array,
  segment : Segment,
  isLive : boolean
) : {
  nextSegments : INextSegmentsInfos[];
  segmentInfos : ISegmentTimingInfos;
} {
  const nextSegments : INextSegmentsInfos[] = [];
  let segmentInfos : ISegmentTimingInfos;

  let tfxdSegment : IISOBMFFBasicSegment|undefined;
  let tfrfSegments : IISOBMFFBasicSegment[]|undefined;
  if (isLive) {
    const traf = getTraf(responseData);
    if (traf) {
      tfrfSegments = parseTfrf(traf);
      tfxdSegment = parseTfxd(traf);
    } else {
      log.warn("smooth: could not find traf atom");
    }
  }

  if (!tfxdSegment) {
    // we could always make a mistake when reading a container.
    // If the estimate is too far from what the segment seems to imply, take
    // the segment infos instead.
    const maxDecodeTimeDelta = Math.min(
      segment.timescale * 0.9,
      segment.duration != null ? segment.duration / 4 : 0.25
    );

    const trunDuration = getDurationFromTrun(responseData);
    if (
      trunDuration >= 0 && (segment.duration == null ||
      Math.abs(trunDuration - segment.duration) <= maxDecodeTimeDelta)
    ) {
      segmentInfos = {
        time: segment.time,
        duration: trunDuration,
        timescale: segment.timescale,
      };
    } else {
      segmentInfos = {
        time: segment.time,
        duration: segment.duration,
        timescale: segment.timescale,
      };
    }
  } else {
    segmentInfos = {
      time: tfxdSegment.time,
      duration: tfxdSegment.duration,
      timescale: segment.timescale,
    };
  }

  if (tfrfSegments) {
    for (let i = 0; i < tfrfSegments.length; i++) {
      nextSegments.push({
        time: tfrfSegments[i].time,
        duration: tfrfSegments[i].duration,
        timescale: segment.timescale,
      });
    }
  }

  return { nextSegments, segmentInfos };
}

export default extractTimingsInfos;
