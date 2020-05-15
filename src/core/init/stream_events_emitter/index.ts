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
  EMPTY,
  interval,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  finalize,
  mergeMap,
} from "rxjs/operators";
import config from "../../../config";
import Manifest from "../../../manifest";
import getScheduledEvents from "./get_scheduled_events";
import {
  IStreamEvent,
  IStreamEventData
} from "./types";

const { STREAM_EVENT_EMITTER_POLL_INTERVAL } = config;
const boundsShift = (STREAM_EVENT_EMITTER_POLL_INTERVAL * 0.6) / 1000;

/**
 * Get events from manifest and emit each time an event has to be emitted
 * @param {Object} manifest
 * @param {HTMLMediaElement} mediaElement
 */
function streamEventsEmitter(manifest: Manifest,
                             mediaElement: HTMLMediaElement
): Observable<IStreamEvent> {
  let scheduledEvents: IStreamEventData[] = [];

  /**
   * Get new scheduled events, renew current events in and
   * replace old events.
   */
  function updateEvents(): void {
    const newScheduledEvent = getScheduledEvents(scheduledEvents, manifest);
    scheduledEvents = newScheduledEvent;
  }

  updateEvents();
  manifest.addEventListener("manifestUpdate", updateEvents);

  return interval(STREAM_EVENT_EMITTER_POLL_INTERVAL)
    .pipe(
      filter(() => scheduledEvents.length !== 0),
      mergeMap(() => {
        const { currentTime } = mediaElement;
        const eventsToSend: IStreamEvent[] = [];
        for (let i = scheduledEvents.length - 1; i >= 0; i--) {
          const event = scheduledEvents[i];
          const { isBeingPlayed } = event;
          const { start, end } = event;

          // We shift the start and end in case an event shall last less than
          // STREAM_EVENT_EMITTER_POLL_INTERVAL
          // Thus, we may trigger each in and out event with a tiny time shift.
          const shouldShift = end === undefined ||
                              (end - start) < STREAM_EVENT_EMITTER_POLL_INTERVAL;
          const shiftedStart = shouldShift ? start - boundsShift :
                                             start;
          const shiftedEnd = end === undefined ? end :
                                                 shouldShift ? (end + boundsShift) :
                                                               end;

          if (isBeingPlayed &&
              (
                shiftedStart > currentTime ||
                (shiftedEnd !== undefined && currentTime >= shiftedEnd)
              )
          ) {
            eventsToSend.push({ type: "stream-event-out",
                                value: event });
            event.isBeingPlayed = false;
          } else if (shiftedStart <= currentTime &&
                     (shiftedEnd === undefined || currentTime < shiftedEnd) &&
                     !isBeingPlayed) {
            eventsToSend.push({ type: "stream-event-in",
                                value: event });
            event.isBeingPlayed = true;
          }
        }

        return eventsToSend.length > 0 ? observableOf(...eventsToSend) :
                                         EMPTY;
      }),
      finalize(() => {
        manifest.removeEventListener("manifestUpdate", updateEvents);
      })
    );
}

export default streamEventsEmitter;
export {
  IStreamEvent,
  IStreamEventData,
} from "./types";
