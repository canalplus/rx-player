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

import { Observable } from "rxjs/Observable";
import Manifest, {
  Period,
} from "../../manifest";
import {
  IBufferClockTick,
  IBufferStateFull,
} from "./representation_buffer";

/**
 * Create empty Buffer Observable, linked to a Period.
 *
 * This observable will never download any segment and just emit a "full"
 * event when reaching the end.
 *
 * @param {Observable} bufferClock$
 * @param {Observable} wantedBufferAhead$
 * @param {Object} content
 * @returns {Observable}
 */
export default function createFakeBuffer(
  bufferClock$ : Observable<IBufferClockTick>,
  wantedBufferAhead$ : Observable<number>,
  content : { manifest : Manifest; period : Period }
) : Observable<IBufferStateFull> {
  const period = content.period;
  return Observable.combineLatest(bufferClock$, wantedBufferAhead$)
    .filter(([clockTick, wantedBufferAhead]) =>
      period.end != null && clockTick.currentTime + wantedBufferAhead >= period.end
    )
    .map(() => {
      return {
        type: "full-buffer" as "full-buffer",
        value: undefined,
      };
    });
}
