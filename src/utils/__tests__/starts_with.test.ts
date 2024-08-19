import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import startsWith from "../starts_with";

// eslint-disable-next-line no-restricted-properties, @typescript-eslint/unbound-method
const initialStartsWith = String.prototype.startsWith;

describe("utils - starts-with", () => {
  beforeEach(() => {
    // @ts-expect-error: We're setting `startsWith` to `undefined` to
    // specifically test our own implementation
    // eslint-disable-next-line no-restricted-properties
    String.prototype.startsWith = undefined;
  });

  afterEach(() => {
    // eslint-disable-next-line no-restricted-properties
    String.prototype.startsWith = initialStartsWith;
  });

  it("should mirror String.prototype.startsWith behavior", () => {
    expect(startsWith("Kindred", "Kin")).toEqual(true);
    expect(startsWith("Loner", "one", 1)).toEqual(true);
    expect(startsWith("Ashtray Wasp", " ", 7)).toEqual(true);

    expect(startsWith("Rival Dealer", "riv")).toEqual(false);
    expect(startsWith("Hiders", "Hid", 1)).toEqual(false);

    expect(startsWith("Come Down To Us", "")).toEqual(true);
    expect(startsWith("Rough Sleeper", "Ro", -5)).toEqual(true);
    expect(startsWith("", "")).toEqual(true);
  });

  if (typeof initialStartsWith === "function") {
    it("should call the original startsWith function if available", () => {
      // eslint-disable-next-line no-restricted-properties
      String.prototype.startsWith = initialStartsWith;
      const mockStartsWith = vi.spyOn(String.prototype, "startsWith");
      const str = "Street Halo";
      expect(startsWith(str, "Stree")).toBe(true);
      expect(startsWith(str, "Halo")).toBe(false);
      expect(startsWith(str, "Stree", 1)).toBe(false);

      expect(mockStartsWith).toHaveBeenCalledTimes(3);
      expect(mockStartsWith).toHaveBeenNthCalledWith(1, "Stree", undefined);
      expect(mockStartsWith).toHaveBeenNthCalledWith(2, "Halo", undefined);
      expect(mockStartsWith).toHaveBeenNthCalledWith(3, "Stree", 1);
    });
  }
});
