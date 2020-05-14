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
  const currentEventsIn: IStreamEventData[] = [];

  /**
   * Refresh local scheduled events list
   */
  function updateScheduledEvents(): void {
    scheduledEvents = [];
    const { periods } = manifest;
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const { streamEvents } = period;
      if (streamEvents !== undefined) {
        streamEvents.forEach((event) => {
          const start = period.start + (event.presentationTime ?? 0);
          const end = event.duration !== undefined ?
            start + event.duration :
            undefined;
          scheduledEvents.push({ start,
                                 end,
                                 id: event.id,
                                 element: event.element });
        });
      }
    }
    for (let j = 0; j < currentEventsIn.length; j++) {
      const evt = currentEventsIn[j];
      if (!scheduledEvents.some((s) => areSameStreamEvents(s, evt))) {
        currentEventsIn.splice(j, 1);
        j--;
      }
    }
  }

  updateScheduledEvents();
  manifest.addEventListener("manifestUpdate", updateScheduledEvents);

  return interval(STREAM_EVENT_EMITTER_POLL_INTERVAL)
    .pipe(
      filter(() => scheduledEvents.length !== 0),
      mergeMap(() => {
        const { currentTime } = mediaElement;
        const eventsToSend: IStreamEvent[] = [];
        for (let i = 0; i < scheduledEvents.length; i++) {
          const event = scheduledEvents[i];
          const currentEventIdx = arrayFindIndex(currentEventsIn,
                                                 (e) => areSameStreamEvents(e, event));
          const { start, end } = event;

          if (end === undefined) {
            if (start <= currentTime) {
              eventsToSend.push({ type: "stream-event-in",
                                  value: event });
              currentEventsIn.push(event);
            }
            if (start > currentTime &&
                currentEventIdx !== -1) {
              currentEventsIn.splice(currentEventIdx, 1);
            }
          } else {
            if (start < currentTime &&
                end > currentTime &&
                currentEventIdx === -1) {
              eventsToSend.push({ type: "stream-event-in",
                                  value: event });
              currentEventsIn.push(event);
            }
            if ((end < currentTime ||
                 start > currentTime) &&
                areSameStreamEvents(currentEventsIn[currentEventIdx], event)) {
              eventsToSend.push({ type: "stream-event-out",
                                  value: event });
              currentEventsIn.splice(currentEventIdx, 1);
            }
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
