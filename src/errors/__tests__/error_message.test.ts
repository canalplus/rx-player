import { describe, it, expect } from "vitest";
import errorMessage from "../error_message";

describe("Errors - generateErrorMessage", () => {
  it("should format a readable error message", () => {
    expect(errorMessage("bar", "baz")).toBe("bar: baz");
  });
});
