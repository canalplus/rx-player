import { describe, it, expect, vi } from "vitest";
import type { IManifest } from "../../../../manifest";
import type { IStreamEventData } from "../../../../public_types";
import type IRefreshScheduledEventsList from "../stream_events_emitter/refresh_scheduled_events_list";
import type {
  INonFiniteStreamEventPayload,
  IStreamEventPayload,
} from "../stream_events_emitter/types";

describe("init - refreshScheduledEventsList", () => {
  it("should correctly refresh scheduled events", async () => {
    function generateEventData(): IStreamEventData {
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
    } as IManifest;
    const oldScheduledEvents: Array<IStreamEventPayload | INonFiniteStreamEventPayload> =
      [
        {
          start: 1000,
          end: 1000000,
          id: "must-disapear",
          data: generateEventData(),
          publicEvent: {
            start: 1000,
            end: 1000000,
            data: generateEventData(),
          },
        },
        {
          start: 0,
          end: 1,
          data: generateEventData(),
          id: "1",
          publicEvent: {
            start: 1000,
            end: 1000000,
            data: generateEventData(),
          },
        },
      ];
    const refreshScheduledEventsList = (
      await vi.importActual("../stream_events_emitter/refresh_scheduled_events_list.ts")
    ).default as typeof IRefreshScheduledEventsList;

    const scheduledEvents = refreshScheduledEventsList(oldScheduledEvents, manifest);
    expect(scheduledEvents).toEqual([
      {
        start: 0,
        end: 1,
        id: "1",
        data: generateEventData(),
        publicEvent: {
          start: 1000,
          end: 1000000,
          data: generateEventData(),
        },
      },
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
