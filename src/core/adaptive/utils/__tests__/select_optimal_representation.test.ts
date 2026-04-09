import { describe, it, expect } from "vitest";
import { DummyRepresentation } from "../../../../manifest/classes/__tests__/mocks";
import selectOptimalRepresentation from "../select_optimal_representation";

describe("ABR - selectOptimalRepresentation", () => {
  const fakeReps = [
    new DummyRepresentation({ bitrate: 100 }),
    new DummyRepresentation({ bitrate: 1000 }),
    new DummyRepresentation({ bitrate: 10000 }),
    new DummyRepresentation({ bitrate: 100000 }),
  ];

  it("should return the best representation when the optimal bitrate given is Infinity", () => {
    expect(selectOptimalRepresentation(fakeReps, Infinity)).toBe(
      fakeReps[fakeReps.length - 1],
    );
  });

  it("should return the best representation when both the optimal bitrate and the higher limit given are higher or equal than the highest Representation", () => {
    expect(selectOptimalRepresentation(fakeReps, 100000)).toBe(
      fakeReps[fakeReps.length - 1],
    );
    expect(selectOptimalRepresentation(fakeReps, 900000)).toBe(
      fakeReps[fakeReps.length - 1],
    );
  });

  it("should return the worst representation when the optimal bitrate given is 0", () => {
    expect(selectOptimalRepresentation(fakeReps, 0)).toBe(fakeReps[0]);
  });

  it("should return the worst representation when the optimal bitrate is lower or equal than the lowest Representation", () => {
    expect(selectOptimalRepresentation(fakeReps, 4)).toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps, 100)).toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps, 0)).toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps, 100)).toBe(fakeReps[0]);
  });
});
