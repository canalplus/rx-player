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
  BehaviorSubject,
  merge as observableMerge,
  Observable,
} from "rxjs";
import {
  filter,
  map,
  share,
} from "rxjs/operators";
import config from "../../../config";
import { MediaError } from "../../../errors";
import log from "../../../log";
import Manifest, {
  LoadedPeriod,
} from "../../../manifest";
import deferSubscriptions from "../../../utils/defer_subscriptions";
import filterMap from "../../../utils/filter_map";
import WeakMapMemory from "../../../utils/weak_map_memory";
import ABRManager from "../../abr";
import { SegmentFetcherCreator } from "../../fetchers";
import SourceBuffersStore, {
  BufferGarbageCollector,
  QueuedSourceBuffer,
} from "../../source_buffers";
import EVENTS from "../events_generators";
import { IPeriodStreamOptions } from "../period";
import { IStreamOrchestratorEvent } from "../types";
import ActivePeriodEmitter from "./active_period_emitter";
import areStreamsComplete from "./are_streams_complete";
import PeriodStreamsCreator, {
  IPeriodStreamClockTick,
} from "./period_buffers_creator";

export type IStreamOrchestratorClockTick = IPeriodStreamClockTick;

const { MAXIMUM_MAX_BUFFER_AHEAD,
        MAXIMUM_MAX_BUFFER_BEHIND } = config;

/** Options tweaking the behavior of the StreamOrchestrator. */
export type IStreamOrchestratorOptions =
  IPeriodStreamOptions &
  { wantedBufferAhead$ : BehaviorSubject<number>;
    maxBufferAhead$ : Observable<number>;
    maxBufferBehind$ : Observable<number>; };

/**
 * Create and manage the various Stream Observables needed for the content to
 * play:
 *
 *   - Create or dispose SourceBuffers depending on the chosen Adaptations.
 *
 *   - Push the right segments to those SourceBuffers depending on the user's
 *     preferences, the current position, the bandwidth, the decryption
 *     conditions...
 *
 *   - Concatenate Streams for adaptation from separate Periods at the right
 *     time, to allow smooth transitions between periods.
 *
 *   - Emit various events to notify of its health and issues
 *
 * Here multiple Streams can be created at the same time to allow smooth
 * transitions between periods.
 * To do this, we dynamically create or destroy Streams as they are needed.
 * @param {Object} content
 * @param {Observable} clock$ - Emit position information
 * @param {Object} abrManager - Emit bitrate estimates and best Representation
 * to play.
 * @param {Object} sourceBuffersStore - Will be used to lazily create
 * SourceBuffer instances associated with the current content.
 * @param {Object} segmentFetcherCreator - Allow to download segments.
 * @param {Object} bufferOptions
 * @returns {Observable}
 */
export default function StreamOrchestrator(
  manifest : Manifest,
  initialTime : number,
  clock$ : Observable<IStreamOrchestratorClockTick>,
  abrManager : ABRManager,
  sourceBuffersStore : SourceBuffersStore,
  segmentFetcherCreator : SegmentFetcherCreator<any>,
  options: IStreamOrchestratorOptions
) : Observable<IStreamOrchestratorEvent> {
  const { maxBufferAhead$, maxBufferBehind$ } = options;

  // Keep track of a unique BufferGarbageCollector created per
  // QueuedSourceBuffer.
  const garbageCollectors =
    new WeakMapMemory((qSourceBuffer : QueuedSourceBuffer<unknown>) => {
      const { bufferType } = qSourceBuffer;
      const defaultMaxBehind = MAXIMUM_MAX_BUFFER_BEHIND[bufferType] != null ?
                                 MAXIMUM_MAX_BUFFER_BEHIND[bufferType] as number :
                                 Infinity;
      const defaultMaxAhead = MAXIMUM_MAX_BUFFER_AHEAD[bufferType] != null ?
                                MAXIMUM_MAX_BUFFER_AHEAD[bufferType] as number :
                                Infinity;
      return BufferGarbageCollector({
        queuedSourceBuffer: qSourceBuffer,
        clock$: clock$.pipe(map(tick => tick.currentTime)),
        maxBufferBehind$: maxBufferBehind$
                            .pipe(map(val => Math.min(val, defaultMaxBehind))),
        maxBufferAhead$: maxBufferAhead$
                           .pipe(map(val => Math.min(val, defaultMaxAhead))),
      });
    });

  // trigger warnings when the wanted time is before or after the manifest's
  // segments
  const outOfManifest$ = clock$.pipe(
    filterMap(({ currentTime, wantedTimeOffset }) => {
      const position = wantedTimeOffset + currentTime;
      if (position < manifest.getMinimumPosition()) {
        const warning = new MediaError("MEDIA_TIME_BEFORE_MANIFEST",
                                       "The current position is behind the " +
                                       "earliest time announced in the Manifest.");
        return EVENTS.warning(warning);
      } else if (position > manifest.getMaximumPosition()) {
        const warning = new MediaError("MEDIA_TIME_AFTER_MANIFEST",
                                       "The current position is after the latest " +
                                       "time announced in the Manifest.");
        return EVENTS.warning(warning);
      }
      return null;
    }, null));

  const bufferTypes = sourceBuffersStore.getBufferTypes();

  const streamsArray = bufferTypes.map((bufferType) => {
    return PeriodStreamsCreator(bufferType,
                                { abrManager,
                                  options,
                                  clock$,
                                  garbageCollectors,
                                  initialTime,
                                  manifest,
                                  segmentFetcherCreator,
                                  sourceBuffersStore })
      .pipe(deferSubscriptions(), share());
  });

  // Emits the activePeriodChanged events every time the active Period changes.
  const activePeriodChanged$ = ActivePeriodEmitter(streamsArray).pipe(
    filter((period) : period is LoadedPeriod => period != null),
    map(period => {
      log.info("Stream: New active period", period);
      return EVENTS.activePeriodChanged(period);
    }));

  // Emits an "end-of-stream" event once every PeriodStream are complete.
  // Emits a 'resume-stream" when it's not
  const endOfStream$ = areStreamsComplete(...streamsArray)
    .pipe(map((areComplete) =>
      areComplete ? EVENTS.endOfStream() : EVENTS.resumeStream()
    ));

  return observableMerge(...streamsArray,
                         activePeriodChanged$,
                         endOfStream$,
                         outOfManifest$);
}
