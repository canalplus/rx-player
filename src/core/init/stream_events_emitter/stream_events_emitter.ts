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
  INonFiniteStreamEventPayload,
  IStreamEvent,
  IStreamEventPayload,
} from "./types";

const { STREAM_EVENT_EMITTER_POLL_INTERVAL } = config;

/**
 * Tells if a stream event has a duration
 * @param {Object} evt
 * @returns {Boolean}
 */
function isFiniteStreamEvent(
  evt: IStreamEventPayload|INonFiniteStreamEventPayload
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
    new WeakMap<IStreamEventPayload|INonFiniteStreamEventPayload, true>();
  const scheduledEvents$ = fromEvent(manifest, "manifestUpdate").pipe(
    startWith(null),
    scan((oldScheduleEvents) => {
      return refreshScheduledEventsList(oldScheduleEvents, manifest);
    }, [] as Array<IStreamEventPayload|INonFiniteStreamEventPayload>)
  );

  function poll$(
    newScheduleEvents: Array<IStreamEventPayload|INonFiniteStreamEventPayload>
  ) {
    if (newScheduleEvents.length === 0) {
      return EMPTY;
    }
    return observableCombineLatest([
      interval(STREAM_EVENT_EMITTER_POLL_INTERVAL),
      clock$,
    ]).pipe(
        map(([_, clockTick]) => {
          const { seeking } = clockTick;
          return { isSeeking: seeking,
                   currentTime: mediaElement.currentTime };
        }),
        pairwise(),
        mergeMap(([ oldTick, newTick ]) => {
          const { currentTime: previousTime } = oldTick;
          const { isSeeking, currentTime } = newTick;
          const eventsToSend: IStreamEvent[] = [];
          for (let i = newScheduleEvents.length - 1; i >= 0; i--) {
            const event = newScheduleEvents[i];
            const start = event.start;
            const end = isFiniteStreamEvent(event) ? event.end :
                                                     undefined;
            const isBeingPlayed = eventsBeingPlayed.has(event);
            if (isBeingPlayed) {
              if (start > currentTime ||
                  (end !== undefined && currentTime >= end)
              ) {
                if (isFiniteStreamEvent(event) &&
                    typeof event.publicEvent.onExit === "function") {
                  event.publicEvent.onExit();
                }
                eventsBeingPlayed.delete(event);
              }
            } else if (start <= currentTime &&
                       end !== undefined &&
                       currentTime < end) {
              eventsToSend.push({ type: "stream-event",
                                  value: event.publicEvent });
              eventsBeingPlayed.set(event, true);
            } else if (previousTime < start &&
                       currentTime >= (end ?? start)) {
              if (isSeeking) {
                eventsToSend.push({ type: "stream-event-skip",
                                    value: event.publicEvent });
              } else {
                eventsToSend.push({ type: "stream-event",
                                    value: event.publicEvent });
              }
            }
          }

          return eventsToSend.length > 0 ? observableOf(...eventsToSend) :
                                           EMPTY;
        })
      );
  }

  return scheduledEvents$.pipe(switchMap(poll$));
}

export default streamEventsEmitter;
export {
  IStreamEvent,
  IPublicNonFiniteStreamEvent,
  IPublicStreamEvent
} from "./types";
