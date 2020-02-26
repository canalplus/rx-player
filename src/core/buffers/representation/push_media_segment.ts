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
  Observable,
} from "rxjs";
import { map } from "rxjs/operators";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import { ISegmentParserParsedSegment } from "../../../transports";
import objectAssign from "../../../utils/object_assign";
import { QueuedSourceBuffer } from "../../source_buffers";
import EVENTS from "../events_generators";
import { IBufferEventAddedSegment } from "../types";
import appendSegmentToSourceBuffer from "./append_segment_to_source_buffer";

/**
 * Push a given media segment (non-init segment) to a QueuedSourceBuffer.
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
    queuedSourceBuffer } : { clock$ : Observable<{ currentTime : number }>;
                             content: { adaptation : Adaptation;
                                        manifest : Manifest;
                                        period : Period;
                                        representation : Representation; };
                             initSegmentData : T | null;
                             parsedSegment : ISegmentParserParsedSegment<T>;
                             segment : ISegment;
                             queuedSourceBuffer : QueuedSourceBuffer<T>; }
) : Observable< IBufferEventAddedSegment<T> > {
  return observableDefer(() => {
    if (parsedSegment.chunkData === null) {
      return EMPTY;
    }
    const { chunkData,
            chunkInfos,
            chunkOffset,
            appendWindow } = parsedSegment;
    const codec = content.representation.getMimeTypeString();
    const data = { initSegment: initSegmentData,
                   chunk: chunkData,
                   timestampOffset: chunkOffset,
                   appendWindow,
                   codec };

    let estimatedStart : number|undefined;
    let estimatedDuration : number|undefined;
    if (chunkInfos !== null) {
      estimatedStart = chunkInfos.time / chunkInfos.timescale;
      estimatedDuration = chunkInfos.duration !== undefined ?
        chunkInfos.duration / chunkInfos.timescale :
        undefined;
    }
    const inventoryInfos = objectAssign({ segment,
                                          estimatedStart,
                                          estimatedDuration },
                                        content);
    return appendSegmentToSourceBuffer(clock$,
                                       queuedSourceBuffer,
                                       { data, inventoryInfos })
      .pipe(map(() => {
        const buffered = queuedSourceBuffer.getBufferedRanges();
        return EVENTS.addedSegment(content, segment, buffered, chunkData);
      }));
  });
}
