import { describe, it, expect } from "vitest";
import { __MANIFEST_CLASSES_MOCKS } from "../../../../manifest/classes";
import filterByBitrate from "../filter_by_bitrate";

describe("ABR - filterByBitrate", () => {
  const fakeReps = [
    new __MANIFEST_CLASSES_MOCKS.DummyRepresentation({ bitrate: 100 }),
    new __MANIFEST_CLASSES_MOCKS.DummyRepresentation({ bitrate: 100 }),
    new __MANIFEST_CLASSES_MOCKS.DummyRepresentation({ bitrate: 1000 }),
    new __MANIFEST_CLASSES_MOCKS.DummyRepresentation({ bitrate: 10000 }),
    new __MANIFEST_CLASSES_MOCKS.DummyRepresentation({ bitrate: 100000 }),
  ];

  describe("filterByBitrate", () => {
    it("should return no Representation if no Representation was specified", () => {
      expect(filterByBitrate([], Infinity)).toEqual([]);
    });

    it("should return all representations when specified bitrate is infinite", () => {
      expect(filterByBitrate(fakeReps, Infinity)).toEqual(fakeReps);
    });

    it("should return the lowest representation when specified bitrate is 0", () => {
      const expectedFilteredReps = [fakeReps[0], fakeReps[1]];
      expect(filterByBitrate(fakeReps, 0)).toEqual(expectedFilteredReps);
    });

    it("should filter representation when specified bitrate is 999", () => {
      const expectedFilteredReps = [fakeReps[0], fakeReps[1], fakeReps[2]];
      expect(filterByBitrate(fakeReps, 1010)).toEqual(expectedFilteredReps);
    });
  });
});
