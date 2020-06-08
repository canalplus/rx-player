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

import config from "../../../config";
import Manifest from "../../../manifest";
import areSameStreamEvents from "./are_same_stream_events";
import { IStreamEventPrivateData } from "./types";

const { STREAM_EVENT_EMITTER_POLL_INTERVAL } = config;
const boundsShift = (STREAM_EVENT_EMITTER_POLL_INTERVAL * 0.6) / 1000;

/**
 * Refresh local scheduled events list
 */
function getScheduledEvents(currentScheduledEvents: IStreamEventPrivateData[],
                            manifest: Manifest): IStreamEventPrivateData[] {
  const scheduledEvents: IStreamEventPrivateData[] = [];
  const { periods } = manifest;
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const { streamEvents } = period;
    if (streamEvents !== undefined) {
      streamEvents.forEach(({ start, end, id, data }) => {
        for (let j = 0; j < currentScheduledEvents.length; j++) {
          const currentScheduleEvent = currentScheduledEvents[j];
          if (areSameStreamEvents(currentScheduleEvent, { id, start, end })) {
            scheduledEvents.push(currentScheduleEvent);
            return;
          }
        }

        // We shift the start and end in case an event shall last less than
        // STREAM_EVENT_EMITTER_POLL_INTERVAL
        // Thus, we may trigger each in and out event with a tiny time shift.
        const shouldShift = end !== undefined &&
                            (end - start) < STREAM_EVENT_EMITTER_POLL_INTERVAL / 1000;
        const _shiftedStart = shouldShift ? start - boundsShift :
                                            start;
        const _shiftedEnd = end === undefined ? undefined :
                                               shouldShift ? (end + boundsShift) :
                                                             end;
        const newScheduledEvent = { start,
                                    end,
                                    _shiftedStart,
                                    _shiftedEnd,
                                    id,
                                    data };
        scheduledEvents.push(newScheduledEvent);
      });
    }
  }
  return scheduledEvents;
}

export default getScheduledEvents;
