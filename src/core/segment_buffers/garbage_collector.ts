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
  combineLatest as observableCombineLatest,
  concatAll,
  EMPTY,
  from as observableFrom,
  ignoreElements,
  mergeMap,
  Observable,
} from "rxjs";
import log from "../../log";
import { getInnerAndOuterTimeRanges } from "../../utils/ranges";
import { SegmentBuffer } from "./implementations";

export interface IGarbageCollectorArgument {
  /** SegmentBuffer implementation */
  segmentBuffer : SegmentBuffer;
  /** Emit current position in seconds regularly */
  clock$ : Observable<number>;
  /** Maximum time to keep behind current time position, in seconds */
  maxBufferBehind$ : Observable<number>;
  /** Minimum time to keep behind current time position, in seconds */
  maxBufferAhead$ : Observable<number>;
}

/**
 * Perform cleaning of the buffer according to the values set by the user
 * at each clock tick and each times the maxBufferBehind/maxBufferAhead values
 * change.
 *
 * @param {Object} opt
 * @returns {Observable}
 */
export default function BufferGarbageCollector({
  segmentBuffer,
  clock$,
  maxBufferBehind$,
  maxBufferAhead$,
} : IGarbageCollectorArgument) : Observable<never> {
  return observableCombineLatest([clock$, maxBufferBehind$, maxBufferAhead$]).pipe(
    mergeMap(([currentTime, maxBufferBehind, maxBufferAhead]) => {
      return clearBuffer(segmentBuffer,
                         currentTime,
                         maxBufferBehind,
                         maxBufferAhead);
    }));
}

/**
 * Remove buffer from the browser's memory based on the user's
 * maxBufferAhead / maxBufferBehind settings.
 *
 * Normally, the browser garbage-collect automatically old-added chunks of
 * buffer data when memory is scarce. However, you might want to control
 * the size of memory allocated. This function takes the current position
 * and a "depth" behind and ahead wanted for the buffer, in seconds.
 *
 * Anything older than the depth will be removed from the buffer.
 * @param {Object} segmentBuffer
 * @param {Number} position - The current position
 * @param {Number} maxBufferBehind
 * @param {Number} maxBufferAhead
 * @returns {Observable}
 */
function clearBuffer(
  segmentBuffer : SegmentBuffer,
  position : number,
  maxBufferBehind : number,
  maxBufferAhead : number
) : Observable<never> {
  if (!isFinite(maxBufferBehind) && !isFinite(maxBufferAhead)) {
    return EMPTY;
  }

  const cleanedupRanges : Array<{ start : number;
                                  end: number; }> = [];
  const { innerRange, outerRanges } =
    getInnerAndOuterTimeRanges(segmentBuffer.getBufferedRanges(),
                               position);

  const collectBufferBehind = () => {
    if (!isFinite(maxBufferBehind)) {
      return ;
    }

    // begin from the oldest
    for (let i = 0; i < outerRanges.length; i++) {
      const outerRange = outerRanges[i];
      if (position - maxBufferBehind >= outerRange.end) {
        cleanedupRanges.push(outerRange);
      }
      else if (position >= outerRange.end &&
               position - maxBufferBehind > outerRange.start &&
               position - maxBufferBehind < outerRange.end
      ) {
        cleanedupRanges.push({ start: outerRange.start,
                               end: position - maxBufferBehind });
      }
    }
    if (innerRange != null) {
      if (position - maxBufferBehind > innerRange.start) {
        cleanedupRanges.push({ start: innerRange.start,
                               end: position - maxBufferBehind });
      }
    }
  };

  const collectBufferAhead = () => {
    if (!isFinite(maxBufferAhead)) {
      return ;
    }

    // begin from the oldest
    for (let i = 0; i < outerRanges.length; i++) {
      const outerRange = outerRanges[i];
      if (position + maxBufferAhead <= outerRange.start) {
        cleanedupRanges.push(outerRange);
      }
      else if (position <= outerRange.start &&
               position + maxBufferAhead < outerRange.end &&
               position + maxBufferAhead > outerRange.start
      ) {
        cleanedupRanges.push({ start: position + maxBufferAhead,
                               end: outerRange.end });
      }
    }
    if (innerRange != null) {
      if (position + maxBufferAhead < innerRange.end) {
        cleanedupRanges.push({ start: position + maxBufferAhead,
                               end: innerRange.end });
      }
    }
  };

  collectBufferBehind();
  collectBufferAhead();
  const clean$ = observableFrom(
    cleanedupRanges.map((range) => {
      log.debug("GC: cleaning range from SegmentBuffer", range);
      return segmentBuffer.removeBuffer(range.start, range.end);
    })
  ).pipe(concatAll(), ignoreElements());

  return clean$;
}
