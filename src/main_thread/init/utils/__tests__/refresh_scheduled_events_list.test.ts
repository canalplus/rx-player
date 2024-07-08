import { describe, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("init - refreshScheduledEventsList", () => {
  it("should correclty refresh scheduled events", async () => {
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
    const manifest = {
      periods: [
        {
          start: 0,
          streamEvents: [{ start: 0, end: 1, data: generateEventData(), id: "1" }],
        },
        {
          start: 10,
          streamEvents: [
            { start: 11, end: 20, data: generateEventData(), id: "2" },
            { start: 12, data: generateEventData(), id: "3" },
            { start: 13, end: 13.1, data: generateEventData(), id: "4" },
          ],
        },
      ],
    };
    const oldScheduledEvents = [
      { start: 1000, end: 1000000, id: "must-disapear", _isBeingPlayed: true },
      { start: 0, end: 1, data: generateEventData(), id: "1" },
    ];
    const refreshScheduledEventsList = (
      (await vi.importActual(
        "../stream_events_emitter/refresh_scheduled_events_list.ts",
      )) as any
    ).default;

    const scheduledEvents = refreshScheduledEventsList(oldScheduledEvents, manifest);
    expect(scheduledEvents).toEqual([
      { start: 0, end: 1, id: "1", data: generateEventData() },
      {
        start: 11,
        end: 20,
        id: "2",
        publicEvent: { start: 11, end: 20, data: generateEventData() },
        data: generateEventData(),
      },
      {
        start: 12,
        end: undefined,
        id: "3",
        publicEvent: { start: 12, data: generateEventData() },
        data: generateEventData(),
      },
      {
        start: 13,
        end: 13.1,
        id: "4",
        publicEvent: { start: 13, end: 13.1, data: generateEventData() },
        data: generateEventData(),
      },
    ]);
  });
});
