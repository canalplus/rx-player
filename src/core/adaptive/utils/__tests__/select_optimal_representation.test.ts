import { describe, it, expect } from "vitest";
import type { IRepresentation } from "../../../../manifest";
import selectOptimalRepresentation from "../select_optimal_representation";

describe("ABR - selectOptimalRepresentation", () => {
  const fakeReps = [
    { bitrate: 100 },
    { bitrate: 1000 },
    { bitrate: 10000 },
    { bitrate: 100000 },
  ];

  it("should return the best representation when the optimal bitrate given is Infinity", () => {
    expect(selectOptimalRepresentation(fakeReps as IRepresentation[], Infinity)).toBe(
      fakeReps[fakeReps.length - 1],
    );
  });

  it("should return the best representation when both the optimal bitrate and the higher limit given are higher or equal than the highest Representation", () => {
    expect(selectOptimalRepresentation(fakeReps as IRepresentation[], 100000)).toBe(
      fakeReps[fakeReps.length - 1],
    );
    expect(selectOptimalRepresentation(fakeReps as IRepresentation[], 900000)).toBe(
      fakeReps[fakeReps.length - 1],
    );
  });

  it("should return the worst representation when the optimal bitrate given is 0", () => {
    expect(selectOptimalRepresentation(fakeReps as IRepresentation[], 0)).toBe(
      fakeReps[0],
    );
  });

  it("should return the worst representation when the optimal bitrate is lower or equal than the lowest Representation", () => {
    expect(selectOptimalRepresentation(fakeReps as IRepresentation[], 4)).toBe(
      fakeReps[0],
    );
    expect(selectOptimalRepresentation(fakeReps as IRepresentation[], 100)).toBe(
      fakeReps[0],
    );
    expect(selectOptimalRepresentation(fakeReps as IRepresentation[], 0)).toBe(
      fakeReps[0],
    );
    expect(selectOptimalRepresentation(fakeReps as IRepresentation[], 100)).toBe(
      fakeReps[0],
    );
  });
});
