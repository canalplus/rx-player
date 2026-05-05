import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import formatError from "../format_error.ts";
import OtherError from "../other_error.ts";

const mocks = vi.hoisted(() => {
  return {
    isKnownError: vi.fn(),
  };
});

vi.mock("../is_known_error", () => {
  return {
    default: mocks.isKnownError,
  };
});
describe("errors - formatError", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    mocks.isKnownError.mockReset();
  });

  it("should just return the error if it is a Custom Error", () => {
    mocks.isKnownError.mockImplementation(() => true);
    const error1 = new Error("Aaaaaa");
    expect(formatError(error1, { defaultCode: "NONE", defaultReason: "a" })).toBe(error1);
  });

  it("should stringify error if it is an Error but not a Custom Error", () => {
    mocks.isKnownError.mockImplementation(() => false);
    const error1 = new Error("Abcdef");
    const formattedError = formatError(error1, {
      defaultCode: "NONE",
      defaultReason: "a",
    });
    expect(formattedError).toBeInstanceOf(OtherError);
    expect(formattedError.message).toBe("NONE: Error: Abcdef");
    expect(formattedError.code).toBe("NONE");
  });

  it("should stringify error if it is an Error but not a Custom Error", () => {
    mocks.isKnownError.mockImplementation(() => false);
    const error1 = {};
    const formattedError = formatError(error1, {
      defaultCode: "NONE",
      defaultReason: "a",
    });
    expect(formattedError).toBeInstanceOf(OtherError);
    expect(formattedError.message).toBe("NONE: a");
    expect(formattedError.code).toBe("NONE");
  });
});
