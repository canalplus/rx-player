import { describe, it, expect } from "vitest";
import errorMessage from "../../../../src/errors/error_message.ts";

describe("Errors - generateErrorMessage", () => {
  it("should format a readable error message", () => {
    expect(errorMessage("bar", "baz")).toBe("bar: baz");
  });
});
