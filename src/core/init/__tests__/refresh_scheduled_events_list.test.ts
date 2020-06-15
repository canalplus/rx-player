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

describe("core - init - refreshScheduledEventsList", () => {
  it("should correclty refresh scheduled events", () => {
    const manifest = { periods: [
                         { start: 0,
                           streamEvents: [{ start: 0,
                                            end: 1,
                                            id: "1" }] },
                         { start: 10,
                           streamEvents: [{ start: 11,
                                            end: 20,
                                            id: "2" },
                                          { start: 12,
                                            id: "3" },
                                          { start: 13,
                                            end: 13.1,
                                            id: "4" }] },
                       ] };
    const oldScheduledEvents: any[] = [
      { start: 1000, end: 1000000, id: "must-disapear", _isBeingPlayed: true },
      { start: 0,
        end: 1,
        data: undefined,
        id: "1" },
    ];
    /* tslint:disable no-unsafe-any */
    const refreshScheduledEventsList = require("../stream_events_emitter/refresh_scheduled_events_list.ts")
      .default;

    const scheduledEvents = refreshScheduledEventsList(oldScheduledEvents, manifest);
    /* tslint:enable no-unsafe-any */
    expect(scheduledEvents).toEqual([
      { start: 0,
        end: 1,
        id: "1",
        data: undefined },
      { start: 11,
        end: 20,
        id: "2",
        publicEvent: { start: 11,
                       end: 20,
                       data: undefined, },
        data: undefined },
      { start: 12,
        end: undefined,
        id: "3",
        publicEvent: { start: 12,
                       data: undefined, },
        data: undefined },
      { start: 13,
        end: 13.1,
        id: "4",
        publicEvent: { start: 13,
                       end: 13.1,
                       data: undefined, },
        data: undefined },
    ]);
  });
});
