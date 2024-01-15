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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("core - init - refreshScheduledEventsList", () => {
  it("should correclty refresh scheduled events", () => {
    function generateEventData() {
      return {
        type: "dash-event-stream",
        value: {
          schemeIdUri: "toto",
          timescale: 1,
          element: document.createElement("div"),
        },
      };
    }
    const manifest = { periods: [ { start: 0,
                                    streamEvents: [{ start: 0,
                                                     end: 1,
                                                     data: generateEventData(),
                                                     id: "1" }] },
                                  { start: 10,
                                    streamEvents: [{ start: 11,
                                                     end: 20,
                                                     data: generateEventData(),
                                                     id: "2" },
                                                   { start: 12,
                                                     data: generateEventData(),
                                                     id: "3" },
                                                   { start: 13,
                                                     end: 13.1,
                                                     data: generateEventData(),
                                                     id: "4" }] } ] };
    const oldScheduledEvents = [
      { start: 1000,
        end: 1000000,
        id: "must-disapear",
        _isBeingPlayed: true },
      { start: 0,
        end: 1,
        data: generateEventData(),
        id: "1" },
    ];
    const refreshScheduledEventsList = jest.requireActual(
      "../stream_events_emitter/refresh_scheduled_events_list.ts"
    ).default;

    const scheduledEvents = refreshScheduledEventsList(oldScheduledEvents, manifest);
    expect(scheduledEvents).toEqual([
      { start: 0,
        end: 1,
        id: "1",
        data: generateEventData() },
      { start: 11,
        end: 20,
        id: "2",
        publicEvent: { start: 11,
                       end: 20,
                       data: generateEventData() },
        data: generateEventData() },
      { start: 12,
        end: undefined,
        id: "3",
        publicEvent: { start: 12,
                       data: generateEventData() },
        data: generateEventData() },
      { start: 13,
        end: 13.1,
        id: "4",
        publicEvent: { start: 13,
                       end: 13.1,
                       data: generateEventData() },
        data: generateEventData() },
    ]);
  });
});
