import { describe, it, expect } from "vitest";
import type { IRepresentation } from "../../../../manifest";
import filterByBitrate from "../filter_by_bitrate";

describe("ABR - filterByBitrate", () => {
  const fakeReps = [
    { bitrate: 100 },
    { bitrate: 100 },
    { bitrate: 1000 },
    { bitrate: 10000 },
    { bitrate: 100000 },
  ];

  describe("filterByBitrate", () => {
    it("should return no Representation if no Representation was specified", () => {
      expect(filterByBitrate([], Infinity)).toEqual([]);
    });

    it("should return all representations when specified bitrate is infinite", () => {
      expect(filterByBitrate(fakeReps as IRepresentation[], Infinity)).toEqual(fakeReps);
    });

    it("should return the lowest representation when specified bitrate is 0", () => {
      const expectedFilteredReps = [{ bitrate: 100 }, { bitrate: 100 }];
      expect(filterByBitrate(fakeReps as IRepresentation[], 0)).toEqual(
        expectedFilteredReps,
      );
    });

    it("should filter representation when specified bitrate is 999", () => {
      const expectedFilteredReps = [
        { bitrate: 100 },
        { bitrate: 100 },
        { bitrate: 1000 },
      ];
      expect(filterByBitrate(fakeReps as IRepresentation[], 1010)).toEqual(
        expectedFilteredReps,
      );
    });
  });
});
