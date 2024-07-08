import { describe, it, expect } from "vitest";
import noop from "../noop";

describe("utils - noop", () => {
  it("should do nothing at all", () => {
    expect(noop()).toBe(undefined);
  });
});
