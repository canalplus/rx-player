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

describe.only("core - init - getScheduledEvents", () => {
  it("should correclty get scheduled events", () => {
    const manifest = { periods: [
                         { start: 0,
                           streamEvents: [{ presentationTime: 0,
                                            duration: 1000,
                                            timescale: 1000,
                                            id: "1" }] },
                         { start: 10,
                           streamEvents: [{ presentationTime: 1000,
                                            duration: 9000,
                                            timescale: 1000,
                                            id: "2" }] },
                       ] };
    const currentScheduledEvents: any[] = [
      { start: 1000, end: 1000000, id: "must-disapear", isBeingPlayed: true },
      { start: 0, end: 1, id: "1", isBeingPlayed: true },
    ];
    /* tslint:disable no-unsafe-any */
    const getScheduledEvents = require("../stream_events_emitter/get_scheduled_events")
      .default;

    const scheduledEvents = getScheduledEvents(currentScheduledEvents, manifest);
    /* tslint:enable no-unsafe-any */
    expect(scheduledEvents).toEqual([
      { start: 0, end: 1, id: "1", isBeingPlayed: true },
      { start: 11, end: 20, id: "2", isBeingPlayed: false },
    ]);
  });
});
