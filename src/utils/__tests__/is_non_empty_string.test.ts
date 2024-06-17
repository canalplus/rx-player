import { describe, it, expect } from "vitest";
import isNonEmptyString from "../is_non_empty_string";

describe("utils - isNonEmptyString", () => {
  it("should return false for anything that is not a string", () => {
    expect(isNonEmptyString(4)).toBe(false);
    expect(isNonEmptyString(/a/)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString({})).toBe(false);
    expect(isNonEmptyString([])).toBe(false);
  });
  it("should return false for an empty string", () => {
    expect(isNonEmptyString("")).toBe(false);
  });
  it("should return true for a string with at least a single letter", () => {
    expect(isNonEmptyString("\0")).toBe(true);
    expect(isNonEmptyString("\n")).toBe(true);
    expect(isNonEmptyString("a")).toBe(true);
    expect(isNonEmptyString("I Am Damo Suzuki")).toBe(true);
    expect(isNonEmptyString("My new house\nYou should see my house")).toBe(true);
    expect(
      isNonEmptyString(`Became a recluse
                             And bought a computer
                             Set it up in the home`),
    ).toBe(true);
  });
});
