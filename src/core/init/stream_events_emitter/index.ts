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
  mergeMap,
  scan,
  startWith,
  switchMap,
} from "rxjs/operators";
import config from "../../../config";
import Manifest from "../../../manifest";
import getScheduledEvents from "./get_scheduled_events";
import {
  IStreamEvent,
  IStreamEventData
} from "./types";

const { STREAM_EVENT_EMITTER_POLL_INTERVAL } = config;

/**
 * Get events from manifest and emit each time an event has to be emitted
 * @param {Object} manifest
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
function streamEventsEmitter(manifest: Manifest,
                             mediaElement: HTMLMediaElement
): Observable<IStreamEvent> {
  const scheduledEvents$ = new Observable((obs) => {
    const listener = () => obs.next();
    manifest.addEventListener("manifestUpdate", listener);
    return () => {
      manifest.removeEventListener("manifestUpdate", listener);
    };
  }).pipe(
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
    return interval(STREAM_EVENT_EMITTER_POLL_INTERVAL)
      .pipe(
        filter(() => newScheduleEvents.length !== 0),
        mergeMap(() => {
          const { currentTime } = mediaElement;
          const eventsToSend: IStreamEvent[] = [];
          for (let i = newScheduleEvents.length - 1; i >= 0; i--) {
            const event = newScheduleEvents[i];
            const { _isBeingPlayed, _shiftedStart, _shiftedEnd } = event;

            if (_isBeingPlayed &&
                (
                  _shiftedStart > currentTime ||
                  (_shiftedEnd !== undefined && currentTime >= _shiftedEnd)
                )
            ) {
              eventsToSend.push({ type: "stream-event-out",
                                  value: event });
              event._isBeingPlayed = false;
            } else if (_shiftedStart <= currentTime &&
                       (_shiftedEnd === undefined || currentTime < _shiftedEnd) &&
                       !_isBeingPlayed) {
              eventsToSend.push({ type: "stream-event-in",
                                  value: event });
              event._isBeingPlayed = true;
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
