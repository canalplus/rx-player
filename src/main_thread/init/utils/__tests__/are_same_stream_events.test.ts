import { describe, it, expect, vi } from "vitest";
import type IAreSameStreamEvents from "../stream_events_emitter/are_same_stream_events";

describe("init - areSameStreamEvents", () => {
  it("should consider two events to be the same with defined ends", async () => {
    const evt1 = { start: 0, end: 10, id: "1" };
    const evt2 = { start: 0, end: 10, id: "1" };
    const areSameStreamEvents = (
      await vi.importActual("../stream_events_emitter/are_same_stream_events.ts")
    ).default as typeof IAreSameStreamEvents;
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(true);
  });
  it("should consider two events to be the same with undefined ends", async () => {
    const evt1 = { start: 0, end: undefined, id: "1" };
    const evt2 = { start: 0, end: undefined, id: "1" };
    const areSameStreamEvents = (
      await vi.importActual("../stream_events_emitter/are_same_stream_events.ts")
    ).default as typeof IAreSameStreamEvents;
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(true);
  });
  it("should consider two events not to be the same - different ids", async () => {
    const evt1 = { start: 0, end: undefined, id: "1" };
    const evt2 = { start: 0, end: undefined, id: "2" };
    const areSameStreamEvents = (
      await vi.importActual("../stream_events_emitter/are_same_stream_events.ts")
    ).default as typeof IAreSameStreamEvents;
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(false);
  });
  it("should consider two events not to be the same - different starts", async () => {
    const evt1 = { start: 0, end: undefined, id: "1" };
    const evt2 = { start: 10, end: undefined, id: "1" };
    const areSameStreamEvents = (
      await vi.importActual("../stream_events_emitter/are_same_stream_events.ts")
    ).default as typeof IAreSameStreamEvents;
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(false);
  });
  it("should consider two events not to be the same - different end", async () => {
    const evt1 = { start: 0, end: 10, id: "1" };
    const evt2 = { start: 0, end: 30, id: "1" };
    const areSameStreamEvents = (
      await vi.importActual("../stream_events_emitter/are_same_stream_events.ts")
    ).default as typeof IAreSameStreamEvents;
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(false);
  });
});
