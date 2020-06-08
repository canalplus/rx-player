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
import getScheduledEvents from "./get_scheduled_events";
import {
  IStreamEvent,
  IStreamEventData,
} from "./types";

const { STREAM_EVENT_EMITTER_POLL_INTERVAL } = config;

/**
 * Deconstruct and send back public properties on
 * stream event data
 * @param {Object} streamEvent
 * @returns {Object}
 */
function getStreamEventPublicData(
  streamEvent: IStreamEventData
): IStreamEventData {
  const { id,
          data,
          start,
          end } = streamEvent;
  return { id,
           data,
           start,
           end };
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
  const eventsBeingPlayed = new WeakMap<IStreamEventData, true>();
  const scheduledEvents$ = fromEvent(manifest, "manifestUpdate").pipe(
    startWith(null),
    scan((oldScheduleEvents) => {
      return getScheduledEvents(oldScheduleEvents, manifest);
    }, [] as IStreamEventData[])
  );

  return scheduledEvents$.pipe(switchMap(poll$));

  function poll$(newScheduleEvents: IStreamEventData[]) {
    if (newScheduleEvents.length === 0) {
      return EMPTY;
    }
    return observableCombineLatest([
      interval(STREAM_EVENT_EMITTER_POLL_INTERVAL),
      clock$,
    ]).pipe(
        map(() => mediaElement.currentTime),
        pairwise(),
        mergeMap(([ oldCurrentTime, currentTime ]) => {
          const eventsToSend: IStreamEvent[] = [];
          for (let i = newScheduleEvents.length - 1; i >= 0; i--) {
            const event = newScheduleEvents[i];
            const { start, end } = event;
            const isBeingPlayed = eventsBeingPlayed.get(event);
            if (isBeingPlayed === true &&
                (
                  start > currentTime &&
                  (end !== undefined && currentTime >= end)
                )
            ) {
              eventsBeingPlayed.delete(event);
            } else if (start <= currentTime &&
                       end !== undefined &&
                       currentTime < end &&
                       isBeingPlayed !== true) {
              eventsToSend.push({ type: "stream-event",
                                  value: getStreamEventPublicData(event) });
              eventsBeingPlayed.set(event, true);
            } else if ((
                         oldCurrentTime < start &&
                         currentTime >= (end ?? start)
                       ) ||
                       (
                         currentTime < start &&
                         oldCurrentTime >= (end ?? start)
                       )) {
              eventsToSend.push({ type: "stream-event",
                                  value: getStreamEventPublicData(event) });
            }
          }

          return eventsToSend.length > 0 ? observableOf(...eventsToSend) :
                                           EMPTY;
        })
      );
  }
}

export default streamEventsEmitter;
export {
  IStreamEvent,
  IStreamEventData,
} from "./types";
