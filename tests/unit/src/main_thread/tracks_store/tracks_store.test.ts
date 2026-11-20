import { describe, expect, it, vi } from "vitest";

import type { IAdaptationChoice } from "../../../../../src/core/types.ts";
import TracksStore from "../../../../../src/main_thread/tracks_store/tracks_store.ts";
import type { Adaptation, Period } from "../../../../../src/manifest/classes/index.ts";
import SharedReference from "../../../../../src/utils/reference.ts";
import {
  DummyAdaptation,
  DummyManifest,
  DummyPeriod,
  DummyRepresentation,
} from "../../../mocks/manifest.ts";

describe("API - TracksStore", () => {
  it("should advertise an audio-only period when video and text are not handled", () => {
    const tracksStore = new TracksStore({
      preferTrickModeTracks: false,
      defaultAudioTrackSwitchingMode: undefined,
      handledTrackTypes: {
        audio: true,
        video: false,
        text: false,
      },
      onTracksNotPlayableForType: {
        audio: "error",
        video: "error",
        text: "error",
      },
    });
    const onNewAvailablePeriods = vi.fn();
    tracksStore.addEventListener("newAvailablePeriods", onNewAvailablePeriods);

    const period = createPeriod({
      id: "period-1",
      adaptations: [createAdaptation("audio", "audio-adaptation")],
    });

    tracksStore.onManifestUpdate(
      new DummyManifest({
        periods: [period],
      }),
    );

    expect(onNewAvailablePeriods).not.toHaveBeenCalled();

    tracksStore.addTrackReference(
      "audio",
      period,
      new SharedReference<IAdaptationChoice | null | undefined>(undefined),
    );

    expect(onNewAvailablePeriods).toHaveBeenCalledTimes(1);
    expect(tracksStore.getAvailablePeriods()).toEqual([
      { id: "period-1", start: 0, end: 10 },
    ]);
  });
});

function createAdaptation(type: "audio" | "video" | "text", id: string): Adaptation {
  return new DummyAdaptation({
    id,
    type,
    isForcedSubtitles: false,
    representations: [
      new DummyRepresentation({
        id: `${id}-repr`,
        decipherable: true,
        isCodecSupported: true,
      }),
    ],
    supportStatus: {
      hasSupportedCodec: true,
      hasCodecWithUndefinedSupport: false,
      isDecipherable: true,
    },
  });
}

function createPeriod(args: { id: string; adaptations: Adaptation[] }): Period {
  return new DummyPeriod({
    id: args.id,
    start: 0,
    end: 10,
    adaptations: args.adaptations.reduce<typeof Period.prototype.adaptations>(
      (acc, curr) => {
        const forType = acc[curr.type];
        if (forType === undefined) {
          acc[curr.type] = [curr];
        } else {
          forType.push(curr);
        }
        return acc;
      },
      {},
    ),
  });
}
