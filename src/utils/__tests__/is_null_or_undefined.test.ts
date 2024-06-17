import { describe, it, expect } from "vitest";
import isNullOrUndefined from "../is_null_or_undefined";

describe("utils - isNullOrUndefined", () => {
  it("should return true when the value given is `null` or `undefined`", () => {
    expect(isNullOrUndefined(null)).toEqual(true);
    expect(isNullOrUndefined(undefined)).toEqual(true);
  });
  it("should return false when given a value different from null or undefined", () => {
    expect(isNullOrUndefined(0)).toEqual(false);
    expect(isNullOrUndefined(1047)).toEqual(false);
    expect(isNullOrUndefined("")).toEqual(false);
    expect(isNullOrUndefined("toto")).toEqual(false);
    expect(isNullOrUndefined({})).toEqual(false);
    expect(isNullOrUndefined([])).toEqual(false);
    expect(isNullOrUndefined(/a/)).toEqual(false);
  });
});
