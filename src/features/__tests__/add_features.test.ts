import { describe, beforeEach, it, expect, vi } from "vitest";
import addFeatures from "../add_features.ts";
import type { IFeature } from "../types.ts";

vi.mock("../features_object", () => {
  return {
    default: { a: 412 },
  };
});

describe("Features - addFeatures", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should do nothing if an empty array is given", () => {
    expect(() => addFeatures([])).not.toThrow();
  });

  it("should throw if something different than a function is given", () => {
    expect(() => addFeatures([5 as unknown as IFeature])).toThrow(
      new Error("Unrecognized feature"),
    );
    expect(() =>
      addFeatures([
        () => {
          /* noop */
        },
        {} as IFeature,
      ]),
    ).toThrow(new Error("Unrecognized feature"));
  });

  it("should call the given functions with the features object in argument", () => {
    const fakeFeat1 = vi.fn();
    const fakeFeat2 = vi.fn();
    addFeatures([fakeFeat1, fakeFeat2]);
    expect(fakeFeat1).toHaveBeenCalledTimes(1);
    expect(fakeFeat1).toHaveBeenCalledWith({ a: 412 });
    expect(fakeFeat2).toHaveBeenCalledTimes(1);
    expect(fakeFeat2).toHaveBeenCalledWith({ a: 412 });
  });
});
