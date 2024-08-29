import { describe, it, expect } from "vitest";
import type { IParsedTrack } from "../../../types";
import attachTrickModeTrack from "../attach_trickmode_track";

describe("attachTrickModeTrack", () => {
  it("should correclty attach trickmode tracks", () => {
    const trickModeTracks = [
      {
        track: { type: "video" },
        trickModeAttachedTrackIds: ["1", "3"],
      },
      { track: { type: "audio" }, trickModeAttachedTrackIds: ["1"] },
    ] as Array<{
      track: IParsedTrack;
      trickModeAttachedTrackIds: string[];
    }>;

    const tracks = {
      video: {
        ["1"]: { id: "1", trickModeTracks: undefined },
        ["2"]: { id: "2", trickModeTracks: undefined },
        ["3"]: { id: "3", trickModeTracks: undefined },
        ["4"]: { id: "4", trickModeTracks: undefined },
      },
      audio: {
        ["1"]: { id: "1", trickModeTracks: undefined },
        ["2"]: { id: "2", trickModeTracks: undefined },
        ["3"]: { id: "3", trickModeTracks: undefined },
      },
    } as unknown as Record<"audio" | "video" | "text", Record<string, IParsedTrack>>;

    attachTrickModeTrack(tracks, trickModeTracks);

    expect(tracks).toEqual({
      video: {
        ["1"]: { id: "1", trickModeTracks: [{ type: "video" }, { type: "audio" }] },
        ["2"]: { id: "2", trickModeTracks: undefined },
        ["3"]: { id: "3", trickModeTracks: [{ type: "video" }] },
        ["4"]: { id: "4", trickModeTracks: undefined },
      },
      audio: {
        ["1"]: { id: "1", trickModeTracks: [{ type: "video" }, { type: "audio" }] },
        ["2"]: { id: "2", trickModeTracks: undefined },
        ["3"]: { id: "3", trickModeTracks: [{ type: "video" }] },
      },
    });
  });
});
