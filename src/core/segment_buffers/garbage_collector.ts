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
import { getInnerAndOuterTimeRanges } from "../../utils/ranges";
import { IReadOnlySharedReference } from "../../utils/reference";
import { CancellationSignal } from "../../utils/task_canceller";
import { IReadOnlyPlaybackObserver } from "../api";
import { IStreamOrchestratorPlaybackObservation } from "../stream";
import { SegmentBuffer } from "./implementations";

export interface IGarbageCollectorArgument {
  /** SegmentBuffer implementation */
  segmentBuffer : SegmentBuffer;
  /** Emit current position in seconds regularly */
  playbackObserver : IReadOnlyPlaybackObserver<
    Pick<IStreamOrchestratorPlaybackObservation, "position">
  >;
  /** Maximum time to keep behind current time position, in seconds */
  maxBufferBehind : IReadOnlySharedReference<number>;
  /** Minimum time to keep behind current time position, in seconds */
  maxBufferAhead : IReadOnlySharedReference<number>;
}

/**
 * Perform cleaning of the buffer according to the values set by the user
 * each time `playbackObserver` emits and each times the
 * maxBufferBehind/maxBufferAhead values change.
 *
 * Abort this operation when the `cancellationSignal` emits.
 *
 * @param {Object} opt
 * @param {Object} cancellationSignal
 * @returns {Observable}
 */
export default function BufferGarbageCollector(
  { segmentBuffer,
    playbackObserver,
    maxBufferBehind,
    maxBufferAhead } : IGarbageCollectorArgument,
  cancellationSignal : CancellationSignal
) : void {
  let lastPosition : number;
  playbackObserver.listen((o) => {
    lastPosition = o.position.pending ?? o.position.last;
    clean();
  }, { includeLastObservation: true, clearSignal: cancellationSignal });
  function clean() {
    clearBuffer(segmentBuffer,
                lastPosition,
                maxBufferBehind.getValue(),
                maxBufferAhead.getValue(),
                cancellationSignal)
      .catch(e => {
        const errMsg = e instanceof Error ?
          e.message :
          "Unknown error";
        log.error("Could not run BufferGarbageCollector:", errMsg);
      });
  }
  maxBufferBehind.onUpdate(clean, { clearSignal: cancellationSignal });
  maxBufferAhead.onUpdate(clean, { clearSignal: cancellationSignal });
  clean();
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
 * @returns {Promise}
 */
async function clearBuffer(
  segmentBuffer : SegmentBuffer,
  position : number,
  maxBufferBehind : number,
  maxBufferAhead : number,
  cancellationSignal : CancellationSignal
) : Promise<void> {
  if (!isFinite(maxBufferBehind) && !isFinite(maxBufferAhead)) {
    return Promise.resolve();
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

  for (const range of cleanedupRanges) {
    if (range.start < range.end) {
      log.debug("GC: cleaning range from SegmentBuffer", range.start, range.end);
      if (cancellationSignal.cancellationError !== null) {
        throw cancellationSignal.cancellationError;
      }
      await segmentBuffer.removeBuffer(range.start, range.end, cancellationSignal);
    }
  }
}
