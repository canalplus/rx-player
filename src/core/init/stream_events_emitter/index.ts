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
  interval,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  map,
  mergeMap,
  pairwise,
  scan,
  startWith,
  switchMap,
} from "rxjs/operators";
import config from "../../../config";
import Manifest from "../../../manifest";
import { fromEvent } from "../../../utils/event_emitter";
import { IInitClockTick } from "../types";
import refreshScheduledEventsList from "./refresh_scheduled_events_list";
import {
  IStreamEvent,
  IStreamEventData,
  IStreamEventPayload,
  IUnfiniteStreamEventPayload,
} from "./types";

const { STREAM_EVENT_EMITTER_POLL_INTERVAL } = config;

export interface IStreamEventPublicData {
  data: IStreamEventData;
  start: number;
  end?: number;
}

/**
 * Deconstruct and send back public properties on
 * stream event data
 * @param {Object} streamEvent
 * @returns {Object}
 */
function getStreamEventPublicData(
  streamEvent: IStreamEventPayload|IUnfiniteStreamEventPayload
): IStreamEventPublicData {
  return { data: streamEvent.data,
           start: streamEvent.start,
           end: (streamEvent as IStreamEventPayload).end };
}

function isEndedStreamEvent(
  evt: IStreamEventPayload|IUnfiniteStreamEventPayload
): evt is IStreamEventPayload {
  return (evt as IStreamEventPayload).end !== undefined;
}

/**
 * Get events from manifest and emit each time an event has to be emitted
 * @param {Object} manifest
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
function streamEventsEmitter(manifest: Manifest,
                             mediaElement: HTMLMediaElement,
                             clock$: Observable<IInitClockTick>
): Observable<IStreamEvent> {
  const eventsBeingPlayed =
    new WeakMap<IStreamEventPayload|IUnfiniteStreamEventPayload, true>();
  const scheduledEvents$ = fromEvent(manifest, "manifestUpdate").pipe(
    startWith(null),
    scan((oldScheduleEvents) => {
      return refreshScheduledEventsList(oldScheduleEvents, manifest);
    }, [] as Array<IStreamEventPayload|IUnfiniteStreamEventPayload>)
  );

  return scheduledEvents$.pipe(switchMap(poll$));

  function poll$(newScheduleEvents: Array<IStreamEventPayload|IUnfiniteStreamEventPayload>) {
    if (newScheduleEvents.length === 0) {
      return EMPTY;
    }
    return observableCombineLatest([
      interval(STREAM_EVENT_EMITTER_POLL_INTERVAL)
        .pipe(map(() => mediaElement.currentTime)),
      clock$,
    ]).pipe(
        map(([mediaElementCurrentTime, clockTick]) => {
          const { seeking } = clockTick;
          return { isSeeking: seeking,
                   currentTime: Math.max(mediaElementCurrentTime,
                                         clockTick.currentTime) };
        }),
        pairwise(),
        mergeMap(([ oldTick, newTick ]) => {
          const { isSeeking: wasSeeking, currentTime: previousTime } = oldTick;
          const { isSeeking, currentTime } = newTick;
          const eventsToSend: IStreamEvent[] = [];
          for (let i = newScheduleEvents.length - 1; i >= 0; i--) {
            const event = newScheduleEvents[i];
            const start = event.start;
            const end = isEndedStreamEvent(event) ? event.end : undefined;
            // const { start, end } = event;
            const isBeingPlayed = eventsBeingPlayed.has(event);
            if (isBeingPlayed &&
                (
                  start > currentTime ||
                  (end !== undefined && currentTime >= end)
                )
            ) {
              if (isEndedStreamEvent(event) &&
                  event.onLeaving !== undefined &&
                  typeof event.onLeaving === "function") {
                event.onLeaving();
              }
              eventsBeingPlayed.delete(event);
            } else if (start <= currentTime &&
                       end !== undefined &&
                       currentTime < end &&
                       !isBeingPlayed) {
              eventsToSend.push({ type: "stream-event",
                                  value: getStreamEventPublicData(event) });
              eventsBeingPlayed.set(event, true);
            } else if ((
                         previousTime < start &&
                         currentTime >= (end ?? start)
                       ) ||
                       (
                         currentTime < start &&
                         previousTime >= (end ?? start)
                       )) {
              if (isSeeking &&
                  !wasSeeking) {
                eventsToSend.push({ type: "stream-event-skip",
                                    value: getStreamEventPublicData(event) });
              } else {
                eventsToSend.push({ type: "stream-event",
                                    value: getStreamEventPublicData(event) });
              }
            }
          }

          return eventsToSend.length > 0 ? observableOf(...eventsToSend) :
                                           EMPTY;
        })
      );
  }
}

export default streamEventsEmitter;
export { IStreamEvent } from "./types";
