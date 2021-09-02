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
  defer as observableDefer,
  EMPTY,
  map,
  Observable,
} from "rxjs";
import config from "../../../config";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import { ISegmentParserParsedSegment } from "../../../transports";
import objectAssign from "../../../utils/object_assign";
import { SegmentBuffer } from "../../segment_buffers";
import EVENTS from "../events_generators";
import { IStreamEventAddedSegment } from "../types";
import appendSegmentToBuffer from "./append_segment_to_buffer";

const { APPEND_WINDOW_SECURITIES } = config;

/**
 * Push a given media segment (non-init segment) to a SegmentBuffer.
 * The Observable returned:
 *   - emit an event once the segment has been pushed.
 *   - throws on Error.
 * @param {Object} args
 * @returns {Observable}
 */
export default function pushMediaSegment<T>(
  { clock$,
    content,
    initSegmentData,
    parsedSegment,
    segment,
    segmentBuffer } : { clock$ : Observable<{ position : number }>;
                        content: { adaptation : Adaptation;
                                   manifest : Manifest;
                                   period : Period;
                                   representation : Representation; };
                        initSegmentData : T | null;
                        parsedSegment : ISegmentParserParsedSegment<T>;
                        segment : ISegment;
                        segmentBuffer : SegmentBuffer; }
) : Observable< IStreamEventAddedSegment<T> > {
  return observableDefer(() => {
    if (parsedSegment.chunkData === null) {
      return EMPTY;
    }
    const { chunkData,
            chunkInfos,
            chunkOffset,
            appendWindow } = parsedSegment;
    const codec = content.representation.getMimeTypeString();

    // Cutting exactly at the start or end of the appendWindow can lead to
    // cases of infinite rebuffering due to how browser handle such windows.
    // To work-around that, we add a small offset before and after those.
    const safeAppendWindow : [ number | undefined, number | undefined ] = [
      appendWindow[0] !== undefined ?
        Math.max(0, appendWindow[0] - APPEND_WINDOW_SECURITIES.START) :
        undefined,
      appendWindow[1] !== undefined ?
        appendWindow[1] + APPEND_WINDOW_SECURITIES.END :
        undefined,
    ];

    const data = { initSegment: initSegmentData,
                   chunk: chunkData,
                   timestampOffset: chunkOffset,
                   appendWindow: safeAppendWindow,
                   codec };

    let estimatedStart = chunkInfos?.time ?? segment.time;
    const estimatedDuration = chunkInfos?.duration ?? segment.duration;
    let estimatedEnd = estimatedStart + estimatedDuration;
    if (safeAppendWindow[0] !== undefined) {
      estimatedStart = Math.max(estimatedStart, safeAppendWindow[0]);
    }
    if (safeAppendWindow[1] !== undefined) {
      estimatedEnd = Math.min(estimatedEnd, safeAppendWindow[1]);
    }

    const inventoryInfos = objectAssign({ segment,
                                          start: estimatedStart,
                                          end: estimatedEnd },
                                        content);

    return appendSegmentToBuffer(clock$, segmentBuffer, { data, inventoryInfos })
      .pipe(map(() => {
        const buffered = segmentBuffer.getBufferedRanges();
        return EVENTS.addedSegment(content, segment, buffered, chunkData);
      }));
  });
}
