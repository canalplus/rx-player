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

describe("core - init - areSameStreamEvents", () => {
  it("should consider two events to be the same with defined ends", () => {
    const evt1 = { start: 0,
                   end: 10,
                   id: "1" };
    const evt2 = { start: 0,
                   end: 10,
                   id: "1" };
    /* tslint:disable no-unsafe-any */
    const areSameStreamEvents =
      require("../stream_events_emitter/are_same_stream_events.ts").default;
    const result = areSameStreamEvents(evt1, evt2);
    /* tslint:enable no-unsafe-any */
    expect(result).toBe(true);
  });
  it("should consider two events to be the same with undefined ends", () => {
    const evt1 = { start: 0,
                   end: undefined,
                   id: "1" };
    const evt2 = { start: 0,
                   end: undefined,
                   id: "1" };
    /* tslint:disable no-unsafe-any */
    const areSameStreamEvents =
      require("../stream_events_emitter/are_same_stream_events.ts").default;
    const result = areSameStreamEvents(evt1, evt2);
    /* tslint:enable no-unsafe-any */
    expect(result).toBe(true);
  });
  it("should consider two events not to be the same - different ids", () => {
    const evt1 = { start: 0,
                   end: undefined,
                   id: "1" };
    const evt2 = { start: 0,
                   end: undefined,
                   id: "2" };
    /* tslint:disable no-unsafe-any */
    const areSameStreamEvents =
      require("../stream_events_emitter/are_same_stream_events.ts").default;
    const result = areSameStreamEvents(evt1, evt2);
    /* tslint:enable no-unsafe-any */
    expect(result).toBe(false);
  });
  it("should consider two events not to be the same - different starts", () => {
    const evt1 = { start: 0,
                   end: undefined,
                   id: "1" };
    const evt2 = { start: 10,
                   end: undefined,
                   id: "1" };
    /* tslint:disable no-unsafe-any */
    const areSameStreamEvents =
      require("../stream_events_emitter/are_same_stream_events.ts").default;
    const result = areSameStreamEvents(evt1, evt2);
    /* tslint:enable no-unsafe-any */
    expect(result).toBe(false);
  });
  it("should consider two events not to be the same - different end", () => {
    const evt1 = { start: 0,
                   end: 10,
                   id: "1" };
    const evt2 = { start: 0,
                   end: 30,
                   id: "1" };
    /* tslint:disable no-unsafe-any */
    const areSameStreamEvents =
      require("../stream_events_emitter/are_same_stream_events.ts").default;
    const result = areSameStreamEvents(evt1, evt2);
    /* tslint:enable no-unsafe-any */
    expect(result).toBe(false);
  });
});
