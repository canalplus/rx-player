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
import config from "../../config";
import Manifest from "../../manifest";
import arrayFindIndex from "../../utils/array_find_index";

const { STREAM_EVENT_EMITTER_POLL_INTERVAL } = config;
const boundsShift = (STREAM_EVENT_EMITTER_POLL_INTERVAL * 0.6) / 1000;

export interface IStreamEventData {
  start: number;
  end?: number;
  id?: string;
  element: Node | Element;
}

interface IStreamEventIn {
  type: "stream-event-in";
  value: IStreamEventData;
}

interface IStreamEventOut {
  type: "stream-event-out";
  value: IStreamEventData;
}

export type IStreamEvent = IStreamEventIn |
                           IStreamEventOut;

/**
 * Compare 2 events.
 * @param {Object} evt1
 * @param {Object} evt2
 * @returns {Boolean}
 */
function areSameStreamEvents(evt1: IStreamEventData,
                             evt2: IStreamEventData): boolean {
  return evt1.id === evt2.id &&
         evt1.start === evt2.start &&
         evt1.end === evt2.end;
}

/**
 * Get events from manifest and emit each time an event has to be emitted
 * @param {Object} manifest
 * @param {HTMLMediaElement} mediaElement
 */
function streamEventsEmitter(manifest: Manifest,
                             mediaElement: HTMLMediaElement
): Observable<IStreamEvent> {
  let scheduledEvents: IStreamEventData[] = [];
  let currentEventsIn: IStreamEventData[] = [];

  /**
   * Refresh local scheduled events list
   */
  function updateScheduledEvents(): void {
    scheduledEvents = [];
    const newCurrentEventsIn: IStreamEventData[] = [];
    const { periods } = manifest;
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const { streamEvents } = period;
      if (streamEvents !== undefined) {
        streamEvents.forEach((event) => {
          const eventStart = (event.presentationTime ?? 0) / event.timescale;
          const start = period.start + eventStart;
          const end = event.duration !== undefined ?
            eventStart + (event.duration / event.timescale) :
            undefined;
          const newScheduledEvent = { start,
                                      end,
                                      id: event.id,
                                      element: event.element };
          if (currentEventsIn.length > 0) {
            for (let j = 0; j < currentEventsIn.length; j++) {
              const currentEventIn = currentEventsIn[j];
              if (areSameStreamEvents(currentEventIn, newScheduledEvent)) {
                newCurrentEventsIn.push(currentEventIn);
                currentEventsIn.splice(j, 1);
                break;
              }
            }
          }
          if (newScheduledEvent.end === undefined ||
              scheduledEvents.length === 0) {
            scheduledEvents.splice(0, 0, newScheduledEvent);
          } else {
            for (let k = scheduledEvents.length - 1; k >= 0; k--) {
              const scheduledEvent = scheduledEvents[k];
              if (scheduledEvent.end === undefined) {
                scheduledEvents.splice(k, 0, newScheduledEvent);
              } else if (scheduledEvent.end < newScheduledEvent.end) {
                scheduledEvents.splice(k + 1, 0, newScheduledEvent);
              }
            }
          }
        });
      }
    }
    currentEventsIn = newCurrentEventsIn;
  }

  updateScheduledEvents();
  manifest.addEventListener("manifestUpdate", updateScheduledEvents);

  return interval(STREAM_EVENT_EMITTER_POLL_INTERVAL)
    .pipe(
      filter(() => scheduledEvents.length !== 0),
      mergeMap(() => {
        const { currentTime } = mediaElement;
        const eventsToSend: IStreamEvent[] = [];
        for (let i = scheduledEvents.length - 1; i >= 0; i--) {
          const event = scheduledEvents[i];
          const currentEventIdx = arrayFindIndex(currentEventsIn,
                                                 (e) => areSameStreamEvents(e, event));
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

          if (currentEventIdx !== -1 &&
              shiftedStart > currentTime // If currentTime before the start of event
              ||
              (shiftedEnd !== undefined && // If currentTime after the end of event
               currentTime >= shiftedEnd)
          ) {
            eventsToSend.push({ type: "stream-event-out",
                                value: event });
            currentEventsIn.splice(currentEventIdx, 1);
          } else if (shiftedStart <= currentTime &&
                     currentEventIdx === -1) {
            eventsToSend.push({ type: "stream-event-in",
                                value: event });
            currentEventsIn.push(event);
          }
        }

        return eventsToSend.length > 0 ? observableOf(...eventsToSend) :
                                         EMPTY;
      }),
      finalize(() => { manifest.removeEventListener("manifestUpdate",
                                                    updateScheduledEvents); })
    );
}

export default streamEventsEmitter;
