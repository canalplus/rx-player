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
  mergeMap,
  Observable,
  of as observableOf,
} from "rxjs";
import { Period } from "../../../manifest";
import { IReadOnlyPlaybackObserver } from "../../api";
import { IBufferType } from "../../segment_buffers";
import { IStreamStatusEvent } from "../types";
import { IPeriodStreamPlaybackObservation } from "./period_stream";

/**
 * Create empty AdaptationStream Observable, linked to a Period.
 *
 * This observable will never download any segment and just emit a "full"
 * event when reaching the end.
 * @param {Observable} playbackObserver
 * @param {string} bufferType
 * @param {Object} content
 * @returns {Observable}
 */
export default function createEmptyAdaptationStream(
  playbackObserver : IReadOnlyPlaybackObserver<IPeriodStreamPlaybackObservation>,
  bufferType : IBufferType,
  content : { period : Period }
) : Observable<IStreamStatusEvent> {
  const { period } = content;
  const observation$ = playbackObserver.getReference().asObservable();
  return observation$.pipe(
    mergeMap((observation) => {
      const position = observation.position.last;
      return observableOf({ type: "stream-status" as const,
                            value: { period,
                                     bufferType,
                                     position,
                                     imminentDiscontinuity: null,
                                     hasFinishedLoading: true,
                                     neededSegments: [],
                                     shouldRefreshManifest: false } });
    })
  );
}
