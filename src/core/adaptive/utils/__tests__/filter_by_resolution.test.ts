import { describe, it, expect } from "vitest";
import type { IRepresentation } from "../../../../manifest";
import filterByResolution from "../filter_by_resolution";

describe("ABR - filterByResolution", () => {
  const fakeReps = [
    { height: 80, width: 100 },
    { height: 800, width: 1000 },
    { height: 8000, width: 10000 },
    { height: 80000, width: 100000 },
  ];

  describe("filterByResolution", () => {
    it("should do nothing for a given `undefined` height", () => {
      expect(
        filterByResolution(fakeReps as IRepresentation[], {
          height: undefined,
          width: 10,
          pixelRatio: 1,
        }),
      ).toEqual(fakeReps);
    });
    it("should do nothing for a given `undefined` width", () => {
      expect(
        filterByResolution(fakeReps as IRepresentation[], {
          height: undefined,
          width: 10,
          pixelRatio: 1,
        }),
      ).toEqual(fakeReps);
    });

    it("should properly filter until a set resolution", () => {
      expect(
        filterByResolution(fakeReps as IRepresentation[], {
          height: 8000,
          width: 10000,
          pixelRatio: 1,
        }),
      ).toEqual(fakeReps.slice(0, 3));
    });

    it("should include the immediately superior resolution if nothing equal exist", () => {
      expect(
        filterByResolution(fakeReps as IRepresentation[], {
          height: 700,
          width: 900,
          pixelRatio: 1,
        }),
      ).toEqual(fakeReps.slice(0, 2));
    });

    it("should take into account the pixel ratio", () => {
      expect(
        filterByResolution(fakeReps as IRepresentation[], {
          height: 70,
          width: 90,
          pixelRatio: 10,
        }),
      ).toEqual(fakeReps.slice(0, 2));
    });

    it("should take higher resolution if just the height is lower", () => {
      expect(
        filterByResolution(fakeReps as IRepresentation[], {
          height: 801,
          width: 900,
          pixelRatio: 1,
        }),
      ).toEqual(fakeReps.slice(0, 3));
    });

    it("should take higher resolution if just the width is lower", () => {
      expect(
        filterByResolution(fakeReps as IRepresentation[], {
          height: 799,
          width: 1001,
          pixelRatio: 1,
        }),
      ).toEqual(fakeReps.slice(0, 3));
    });
  });
});
