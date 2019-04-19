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
  EMPTY,
  from as observableFrom,
  Observable,
} from "rxjs";
import {
  concatAll,
  ignoreElements,
  mergeMap,
} from "rxjs/operators";
import log from "../../log";
import { getInnerAndOuterTimeRanges } from "../../utils/ranges";
import QueuedSourceBuffer from "./queued_source_buffer";

interface IBufferRange {
  start: number;
  end: number;
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
  queuedSourceBuffer,
  clock$,
  maxBufferBehind$,
  maxBufferAhead$,
} : {
  queuedSourceBuffer : QueuedSourceBuffer<unknown>;
  clock$ : Observable<number>;
  maxBufferBehind$ : Observable<number>;
  maxBufferAhead$ : Observable<number>;
}) : Observable<never> {
  return observableCombineLatest(clock$, maxBufferBehind$, maxBufferAhead$).pipe(
    mergeMap(([currentTime, maxBufferBehind, maxBufferAhead]) => {
      return clearBuffer(
        queuedSourceBuffer,
        currentTime,
        maxBufferBehind,
        maxBufferAhead
      );
    }));
}

/**
 * Remove buffer from the browser's memory based on the user's
 * maxBufferAhead / maxBufferBehind settings.
 *
 * Normally, the browser garbage-collect automatically old-added chunks of
 * buffer date when memory is scarce. However, you might want to control
 * the size of memory allocated. This function takes the current position
 * and a "depth" behind and ahead wanted for the buffer, in seconds.
 *
 * Anything older than the depth will be removed from the buffer.
 * @param {QueuedSourceBuffer} qSourceBuffer
 * @param {Number} position - The current position
 * @param {Number} maxBufferBehind
 * @param {Number} maxBufferAhead
 * @returns {Observable}
 */
function clearBuffer(
  qSourceBuffer : QueuedSourceBuffer<unknown>,
  position : number,
  maxBufferBehind : number,
  maxBufferAhead : number
) : Observable<never> {
  if (!isFinite(maxBufferBehind) && !isFinite(maxBufferAhead)) {
    return EMPTY;
  }

  const cleanedupRanges : IBufferRange[] = [];

  const {
    innerRange: playbackRange,
    outerRanges: outOfPlaybackRanges,
  } = getInnerAndOuterTimeRanges(qSourceBuffer.getBuffered(), position);

  if (isFinite(maxBufferAhead)) {
    const minimumBufferPosition = position - maxBufferBehind;

    // Begin from the oldest buffered range
    for (let i = 0; i < outOfPlaybackRanges.length; i++) {
      const outOfPlaybackRange = outOfPlaybackRanges[i];
      /**
       * [ Buffered Range ]------|------------>
       *                      Min Buffer Pos
       * [ Range to clean ]
       */
      if (minimumBufferPosition >= outOfPlaybackRange.end) {
        cleanedupRanges.push(outOfPlaybackRange);
      } else if (
      /**
       * [ Buffered Range     |         ]-------------|--->
       *                 Min Buffer Pos              Pos
       * [   Range to clean   ]
       */
        position >= outOfPlaybackRange.end &&
        minimumBufferPosition > outOfPlaybackRange.start &&
        minimumBufferPosition < outOfPlaybackRange.end
      ) {
        cleanedupRanges.push({
          start: outOfPlaybackRange.start,
          end: minimumBufferPosition,
        });
      }
    }

    /**
     * --------[ Buffered Range     |         ]------>
     *                        Min Buffer Pos
     *         [   Range to clean   ]
     */
    if (playbackRange) {
      if (minimumBufferPosition > playbackRange.start) {
        cleanedupRanges.push({
          start: playbackRange.start,
          end: minimumBufferPosition,
        });
      }
    }
  }

  if (isFinite(maxBufferAhead)) {
    const maximumBufferPosition = position + maxBufferAhead;

    // Begin from the oldest buffered range
    for (let i = 0; i < outOfPlaybackRanges.length; i++) {
      const outOfPlaybackRange = outOfPlaybackRanges[i];
      /**
       * ------|------------[ Buffered Range ]-->
       *   Max Buffer Pos
       *                    [ Range to clean ]
       */
      if (maximumBufferPosition <= outOfPlaybackRange.start) {
        cleanedupRanges.push(outOfPlaybackRange);
      } else if (
      /**
       * -----|-----[ Buffered Range     |                    ]-->
       *      Pos                   Max Buffer Pos
       *                                 [   Range to clean   ]
       */
        position <= outOfPlaybackRange.start &&
        maximumBufferPosition < outOfPlaybackRange.end &&
        maximumBufferPosition > outOfPlaybackRange.start
      ) {
        cleanedupRanges.push({
          start: maximumBufferPosition,
          end: outOfPlaybackRange.end,
        });
      }
    }

    /**
     * --------[ Buffered Range  |                ]------>
     *                      Max Buffer Pos
     *                           [ Range to clean ]
     */
    if (playbackRange) {
      if (maximumBufferPosition < playbackRange.end) {
        cleanedupRanges.push({
          start: maximumBufferPosition,
          end: playbackRange.end,
        });
      }
    }
  }

  const clearBufferActions$ = cleanedupRanges.map((range) => {
    log.debug("GC: cleaning range from SourceBuffer", range);
    return qSourceBuffer.removeBuffer(range.start, range.end);
  });

  return observableFrom(clearBufferActions$).pipe(
    concatAll(),
    ignoreElements()
  );
}
