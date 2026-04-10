import { describe, it, expect } from "vitest";
import areSameStreamEvents from "../../../../../../../src/main_thread/init/utils/stream_events_emitter/are_same_stream_events.ts";

describe("init - areSameStreamEvents", () => {
  it("should consider two events to be the same with defined ends", () => {
    const evt1 = { start: 0, end: 10, id: "1" };
    const evt2 = { start: 0, end: 10, id: "1" };
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(true);
  });
  it("should consider two events to be the same with undefined ends", () => {
    const evt1 = { start: 0, end: undefined, id: "1" };
    const evt2 = { start: 0, end: undefined, id: "1" };
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(true);
  });
  it("should consider two events not to be the same - different ids", () => {
    const evt1 = { start: 0, end: undefined, id: "1" };
    const evt2 = { start: 0, end: undefined, id: "2" };
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(false);
  });
  it("should consider two events not to be the same - different starts", () => {
    const evt1 = { start: 0, end: undefined, id: "1" };
    const evt2 = { start: 10, end: undefined, id: "1" };
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(false);
  });
  it("should consider two events not to be the same - different end", () => {
    const evt1 = { start: 0, end: 10, id: "1" };
    const evt2 = { start: 0, end: 30, id: "1" };
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(false);
  });
});
