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

import Manifest from "../../../manifest";
import areSameStreamEvents from "./are_same_stream_events";
import {
  IStreamEventPayload,
  IUnfiniteStreamEventPayload,
} from "./types";

/**
 * Refresh local scheduled events list
 * @param {Array.<Object>} oldScheduledEvents
 * @param {Object} manifest
 * @returns {Array.<Object>}
 */
function refreshScheduledEventsList(
  oldScheduledEvents: Array<IStreamEventPayload|IUnfiniteStreamEventPayload>,
  manifest: Manifest
): Array<IStreamEventPayload|IUnfiniteStreamEventPayload> {
  const scheduledEvents: Array<IStreamEventPayload|IUnfiniteStreamEventPayload> = [];
  const { periods } = manifest;
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const { streamEvents } = period;
    streamEvents.forEach(({ start, end, id, data }) => {
      for (let j = 0; j < oldScheduledEvents.length; j++) {
        const currentScheduleEvent = oldScheduledEvents[j];
        if (areSameStreamEvents(currentScheduleEvent, { id, start, end })) {
          scheduledEvents.push(currentScheduleEvent);
          return;
        }
      }

      if (end === undefined) {
        const newScheduledEvent = { start,
                                    id,
                                    data,
                                    publicEvent: { start,
                                                   data }};
        scheduledEvents.push(newScheduledEvent);
      } else {
        const newScheduledEvent = { start,
                                    end,
                                    id,
                                    data,
                                    publicEvent: { start,
                                                   end,
                                                   data }};
        scheduledEvents.push(newScheduledEvent);
      }

    });
  }
  return scheduledEvents;
}

export default refreshScheduledEventsList;
