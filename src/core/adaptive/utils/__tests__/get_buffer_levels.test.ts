import { describe, it, expect } from "vitest";
import getBufferLevels from "../get_buffer_levels";

describe("getBufferLevels", () => {
  it("should return an empty array if given an empty array", () => {
    expect(getBufferLevels([])).toEqual([]);
  });

  it("should always set the first step at 0", () => {
    expect(getBufferLevels([0])).toEqual([0]);
    expect(getBufferLevels([12])).toEqual([0]);
    expect(getBufferLevels([Infinity])).toEqual([0]);

    const bufferLevels = getBufferLevels([0, 7, 8, 9]);
    expect(bufferLevels[0]).toEqual(0);
  });

  it("should set progressive steps in ascending order", () => {
    expect(getBufferLevels([1, 7, 8, 9])).toEqual(
      getBufferLevels([1, 7, 8, 9]).sort((a, b) => a - b),
    );
    expect(getBufferLevels([1, 1.1])).toEqual(
      getBufferLevels([1, 1.1]).sort((a, b) => a - b),
    );
  });

  // it.only("should set higher steps differences for higher bitrate differences", () => {
  //   const steps1 = getBufferLevels([1, 7, 14, 21]);
  //   const steps2 = getBufferLevels([5, 700, 701, 702]);

  //   expect(steps1[0]).toEqual(steps2[0]);
  //   expect(steps1).toEqual(steps2);
  //   expect(steps1[1]).toBeLessThan(steps2[1]);
  // });
});
