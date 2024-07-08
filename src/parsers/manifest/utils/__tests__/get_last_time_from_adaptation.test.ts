import { describe, it, expect } from "vitest";
import type { IRepresentationIndex } from "../../../../manifest";
import getLastPositionFromAdaptation from "../get_last_time_from_adaptation";

function generateRepresentationIndex(
  lastPosition: number | undefined | null,
): IRepresentationIndex {
  return {
    getInitSegment() {
      return null;
    },
    getSegments() {
      return [];
    },
    shouldRefresh() {
      return false;
    },
    getFirstAvailablePosition(): undefined {
      return;
    },
    getLastAvailablePosition(): number | undefined | null {
      return lastPosition;
    },
    getEnd(): undefined {
      return;
    },
    awaitSegmentBetween(): undefined {
      return;
    },
    checkDiscontinuity(): number | null {
      return null;
    },
    isSegmentStillAvailable(): undefined {
      return;
    },
    isStillAwaitingFutureSegments() {
      return true;
    },
    isInitialized(): true {
      return true;
    },
    initialize(): void {
      return;
    },
    addPredictedSegments(): void {
      return;
    },
    canBeOutOfSyncError(): true {
      return true;
    },
    _replace() {
      /* noop */
    },
    _update() {
      /* noop */
    },
  };
}

describe("parsers utils - getLastPositionFromAdaptation", function () {
  it("should return null if no representation", () => {
    expect(
      getLastPositionFromAdaptation({
        id: "0",
        type: "audio",
        representations: [],
      }),
    ).toEqual(null);
  });

  it("should return the last position if a single representation is present", () => {
    const representation1 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(37),
    };
    const representation2 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(undefined),
    };
    const representation3 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(null),
    };
    expect(
      getLastPositionFromAdaptation({
        id: "0",
        type: "audio",
        representations: [representation1],
      }),
    ).toEqual(37);
    expect(
      getLastPositionFromAdaptation({
        id: "0",
        type: "audio",
        representations: [representation2],
      }),
    ).toEqual(undefined);
    expect(
      getLastPositionFromAdaptation({
        id: "0",
        type: "audio",
        representations: [representation3],
      }),
    ).toEqual(null);
  });

  it("should return the minimum first position if many representations is present", () => {
    const representation1 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(37),
    };
    const representation2 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(137),
    };
    const representation3 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(57),
    };
    expect(
      getLastPositionFromAdaptation({
        id: "0",
        type: "audio",
        representations: [representation1, representation2, representation3],
      }),
    ).toEqual(37);
  });

  it("should return undefined if one of the first position is", () => {
    const representation1 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(37),
    };
    const representation2 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(137),
    };
    const representation3 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(undefined),
    };
    expect(
      getLastPositionFromAdaptation({
        id: "0",
        type: "audio",
        representations: [representation1, representation2, representation3],
      }),
    ).toEqual(undefined);
  });

  it("should not consider null first positions if not all of them have one", () => {
    const representation1 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(37),
    };
    const representation2 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(137),
    };
    const representation3 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(null),
    };
    expect(
      getLastPositionFromAdaptation({
        id: "0",
        type: "audio",
        representations: [representation1, representation2, representation3],
      }),
    ).toEqual(37);
  });

  it("should return null if every first positions are", () => {
    const representation1 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(null),
    };
    const representation2 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(null),
    };
    const representation3 = {
      id: "1",
      bitrate: 12,
      cdnMetadata: [],
      index: generateRepresentationIndex(null),
    };
    expect(
      getLastPositionFromAdaptation({
        id: "0",
        type: "audio",
        representations: [representation1, representation2, representation3],
      }),
    ).toEqual(null);
  });
});
