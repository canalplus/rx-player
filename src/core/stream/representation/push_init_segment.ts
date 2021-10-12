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
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import {
  IPushedChunkData,
  SegmentBuffer,
} from "../../segment_buffers";
import EVENTS from "../events_generators";
import { IStreamEventAddedSegment } from "../types";
import appendSegmentToBuffer from "./append_segment_to_buffer";

/**
 * Push the initialization segment to the SegmentBuffer.
 * The Observable returned:
 *   - emit an event once the segment has been pushed.
 *   - throws on Error.
 * @param {Object} args
 * @returns {Observable}
 */
export default function pushInitSegment<T>(
  { clock$,
    content,
    segment,
    segmentData,
    segmentBuffer } : { clock$ : Observable<{ position : number }>;
                        content: { adaptation : Adaptation;
                                   manifest : Manifest;
                                   period : Period;
                                   representation : Representation; };
                        segmentData : T | null;
                        segment : ISegment;
                        segmentBuffer : SegmentBuffer; }
) : Observable< IStreamEventAddedSegment<T> > {
  return observableDefer(() => {
    if (segmentData === null) {
      return EMPTY;
    }
    const codec = content.representation.getMimeTypeString();
    const data : IPushedChunkData<T> = { initSegment: segmentData,
                                         chunk: null,
                                         timestampOffset: 0,
                                         appendWindow: [ undefined, undefined ],
                                         codec };
    return appendSegmentToBuffer(clock$, segmentBuffer, { data,
                                                          inventoryInfos: null })
      .pipe(map(() => {
        const buffered = segmentBuffer.getBufferedRanges();
        return EVENTS.addedSegment(content, segment, buffered, segmentData);
      }));
  });
}
