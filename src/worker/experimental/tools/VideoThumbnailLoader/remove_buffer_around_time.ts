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
  Observable,
  of as observableOf,
} from "rxjs";
import { AudioVideoSegmentBuffer } from "../../../core/segment_buffers/implementations";

/**
 * Remove buffer around wanted time, considering a margin around
 * it that defines what must be kept :
 * If time is 10 and margin is 2, cleaned ranges will be :
 * [0, 8] and [12, videoElement.duration]
 * @param {HTMLMediaElement} videoElement
 * @param {Object} sourceBuffer
 * @param {Number} time
 * @param {Number|undefined} margin
 * @returns {Observable}
 */
export default function removeBufferAroundTime$(
  videoElement: HTMLMediaElement,
  sourceBuffer: AudioVideoSegmentBuffer,
  time: number,
  margin: number = 10 * 60
): Observable<unknown> {
  if (videoElement.buffered.length === 0) {
    return observableOf(null);
  }
  const bufferRemovals$ = [];
  if ((time - margin) > 0) {
    bufferRemovals$.push(sourceBuffer.removeBuffer(0, time - margin));
  }
  if ((time + margin) < videoElement.duration) {
    bufferRemovals$.push(sourceBuffer.removeBuffer(time + margin, videoElement.duration));
  }
  return observableCombineLatest(bufferRemovals$);
}
