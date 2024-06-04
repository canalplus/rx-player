import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("Features - addFeatures", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should do nothing if an empty array is given", async () => {
    const feat = {};
    vi.doMock("../features_object", () => ({
      default: feat,
    }));
    const addFeatures = ((await vi.importActual("../add_features")) as any).default;

    expect(() => addFeatures([])).not.toThrow();
  });

  it("should throw if something different than a function is given", async () => {
    const feat = {};
    vi.doMock("../features_object", () => ({
      default: feat,
    }));
    const addFeatures = ((await vi.importActual("../add_features")) as any).default;

    expect(() => addFeatures([5])).toThrow(new Error("Unrecognized feature"));
    expect(() =>
      addFeatures([
        () => {
          /* noop */
        },
        {},
      ]),
    ).toThrow(new Error("Unrecognized feature"));
  });

  it("should call the given functions with the features object in argument", async () => {
    const feat = { a: 412 };
    vi.doMock("../features_object", () => ({
      default: feat,
    }));
    const addFeatures = ((await vi.importActual("../add_features")) as any).default;

    const fakeFeat1 = vi.fn();
    const fakeFeat2 = vi.fn();
    addFeatures([fakeFeat1, fakeFeat2]);
    expect(fakeFeat1).toHaveBeenCalledTimes(1);
    expect(fakeFeat1).toHaveBeenCalledWith(feat);
    expect(fakeFeat2).toHaveBeenCalledTimes(1);
    expect(fakeFeat2).toHaveBeenCalledWith(feat);
  });
});
