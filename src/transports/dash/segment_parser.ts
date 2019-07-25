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

import {
  of as observableOf,
} from "rxjs";
import {
  getMDHDTimescale,
  getSegmentsFromSidx,
} from "../../parsers/containers/isobmff";
import {
  getSegmentsFromCues,
  getTimeCodeScale,
} from "../../parsers/containers/matroska";
import {
  ISegmentParserArguments,
  ISegmentParserObservable,
} from "../types";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";

export default function parser({ segment,
                                 period,
                                 representation,
                                 response,
                                 init } : ISegmentParserArguments< Uint8Array |
                                                                   ArrayBuffer |
                                                                   null >
) : ISegmentParserObservable< Uint8Array | ArrayBuffer > {
  const { responseData } = response;
  if (responseData == null) {
    return observableOf({ segmentData: null,
                          segmentInfos: null,
                          segmentOffset: 0,
                          appendWindow: [period.start, period.end] });
  }
  const segmentData : Uint8Array = responseData instanceof Uint8Array ?
                                     responseData :
                                     new Uint8Array(responseData);
  const indexRange = segment.indexRange;
  const isWEBM = representation.mimeType === "video/webm" ||
                 representation.mimeType === "audio/webm";
  const nextSegments = isWEBM ?
    getSegmentsFromCues(segmentData, 0) :
    getSegmentsFromSidx(segmentData, indexRange ? indexRange[0] : 0);

  if (!segment.isInit) {
    const segmentInfos = isWEBM ?
      { time: segment.time,
        duration: segment.duration,
        timescale: segment.timescale } :
      getISOBMFFTimingInfos(segment, segmentData, nextSegments, init);
    const segmentOffset = segment.timestampOffset || 0;
    return observableOf({ segmentData,
                          segmentInfos,
                          segmentOffset,
                          appendWindow: [period.start, period.end] });
  }

  if (nextSegments) {
    representation.index._addSegments(nextSegments);
  }
  const timescale = isWEBM ?  getTimeCodeScale(segmentData, 0) :
                              getMDHDTimescale(segmentData);
  return observableOf({ segmentData,
                        segmentInfos: timescale && timescale > 0 ?
                          { time: -1, duration: 0, timescale } :
                          null,
                        segmentOffset: segment.timestampOffset || 0,
                        appendWindow: [period.start, period.end] });
}
