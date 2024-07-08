import { describe, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("init - areSameStreamEvents", () => {
  it("should consider two events to be the same with defined ends", async () => {
    const evt1 = { start: 0, end: 10, id: "1" };
    const evt2 = { start: 0, end: 10, id: "1" };
    const areSameStreamEvents = (
      (await vi.importActual("../stream_events_emitter/are_same_stream_events.ts")) as any
    ).default;
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(true);
  });
  it("should consider two events to be the same with undefined ends", async () => {
    const evt1 = { start: 0, end: undefined, id: "1" };
    const evt2 = { start: 0, end: undefined, id: "1" };
    const areSameStreamEvents = (
      (await vi.importActual("../stream_events_emitter/are_same_stream_events.ts")) as any
    ).default;
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(true);
  });
  it("should consider two events not to be the same - different ids", async () => {
    const evt1 = { start: 0, end: undefined, id: "1" };
    const evt2 = { start: 0, end: undefined, id: "2" };
    const areSameStreamEvents = (
      (await vi.importActual("../stream_events_emitter/are_same_stream_events.ts")) as any
    ).default;
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(false);
  });
  it("should consider two events not to be the same - different starts", async () => {
    const evt1 = { start: 0, end: undefined, id: "1" };
    const evt2 = { start: 10, end: undefined, id: "1" };
    const areSameStreamEvents = (
      (await vi.importActual("../stream_events_emitter/are_same_stream_events.ts")) as any
    ).default;
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(false);
  });
  it("should consider two events not to be the same - different end", async () => {
    const evt1 = { start: 0, end: 10, id: "1" };
    const evt2 = { start: 0, end: 30, id: "1" };
    const areSameStreamEvents = (
      (await vi.importActual("../stream_events_emitter/are_same_stream_events.ts")) as any
    ).default;
    const result = areSameStreamEvents(evt1, evt2);
    expect(result).toBe(false);
  });
});
