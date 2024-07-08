import { describe, it, expect } from "vitest";
import type { IParsedAdaptations, IParsedAdaptation } from "../../../types";
import attachTrickModeTrack from "../attach_trickmode_track";

describe("attachTrickModeTrack", () => {
  it("should correclty attach trickmode tracks", () => {
    const trickModeTracks = [
      {
        adaptation: { type: "video" },
        trickModeAttachedAdaptationIds: ["1", "3"],
      },
      { adaptation: { type: "audio" }, trickModeAttachedAdaptationIds: ["1"] },
    ] as Array<{
      adaptation: IParsedAdaptation;
      trickModeAttachedAdaptationIds: string[];
    }>;

    const adaptations = {
      video: [
        { id: "1", trickModeTracks: undefined },
        { id: "2", trickModeTracks: undefined },
        { id: "3", trickModeTracks: undefined },
        { id: "4", trickModeTracks: undefined },
      ],
      audio: [
        { id: "1", trickModeTracks: undefined },
        { id: "2", trickModeTracks: undefined },
        { id: "3", trickModeTracks: undefined },
      ],
    } as unknown as IParsedAdaptations;

    attachTrickModeTrack(adaptations, trickModeTracks);

    expect(adaptations).toEqual({
      video: [
        { id: "1", trickModeTracks: [{ type: "video" }, { type: "audio" }] },
        { id: "2", trickModeTracks: undefined },
        { id: "3", trickModeTracks: [{ type: "video" }] },
        { id: "4", trickModeTracks: undefined },
      ],
      audio: [
        { id: "1", trickModeTracks: [{ type: "video" }, { type: "audio" }] },
        { id: "2", trickModeTracks: undefined },
        { id: "3", trickModeTracks: [{ type: "video" }] },
      ],
    });
  });
});
