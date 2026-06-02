import { describe, expect, it, vi } from "vitest";

import type { IAdaptationChoice } from "../../../core/types";
import type {
  IAdaptationMetadata,
  IManifestMetadata,
  IPeriodMetadata,
} from "../../../manifest";
import SharedReference from "../../../utils/reference";
import TracksStore from "../tracks_store";

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

    const period = createPeriodMetadata({
      id: "period-1",
      adaptations: {
        audio: [createAdaptation("audio", "audio-adaptation")],
      },
    });

    tracksStore.onManifestUpdate({
      periods: [period],
    } as unknown as IManifestMetadata);

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

function createAdaptation(
  type: "audio" | "video" | "text",
  id: string,
): IAdaptationMetadata {
  return {
    id,
    type,
    normalizedLanguage: undefined,
    isForcedSubtitles: false,
    representations: [
      {
        id: `${id}-repr`,
        decipherable: true,
        isSupported: true,
      },
    ],
    supportStatus: {
      hasSupportedCodec: true,
      hasCodecWithUndefinedSupport: false,
      isDecipherable: true,
    },
  } as unknown as IAdaptationMetadata;
}

function createPeriodMetadata(args: {
  id: string;
  adaptations: Partial<IPeriodMetadata["adaptations"]>;
}): IPeriodMetadata {
  return {
    id: args.id,
    start: 0,
    end: 10,
    adaptations: args.adaptations,
  } as unknown as IPeriodMetadata;
}
