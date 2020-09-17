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
} from "rxjs";
import {
  filter,
  map,
} from "rxjs/operators";
import log from "../../../log";
import { Period } from "../../../manifest";
import { IBufferType } from "../../source_buffers";
import { IStreamStateFull } from "../types";

/**
 * Create empty AdaptationStream Observable, linked to a Period.
 *
 * This observable will never download any segment and just emit a "full"
 * event when reaching the end.
 * @param {Observable} streamClock$
 * @param {Observable} wantedBufferAhead$
 * @param {string} bufferType
 * @param {Object} content
 * @returns {Observable}
 */
export default function createEmptyAdaptationStream(
  streamClock$ : Observable<{ currentTime : number }>,
  wantedBufferAhead$ : Observable<number>,
  bufferType : IBufferType,
  content : { period : Period }
) : Observable<IStreamStateFull> {
  const { period } = content;
  return observableCombineLatest([streamClock$, wantedBufferAhead$]).pipe(
    filter(([clockTick, wantedBufferAhead]) =>
      period.end != null && clockTick.currentTime + wantedBufferAhead >= period.end
    ),
    map(() => {
      log.debug("Stream: full \"empty\" AdaptationStream", bufferType);
      return { type: "full-stream" as "full-stream",
               value: { bufferType } };
    })
  );
}
