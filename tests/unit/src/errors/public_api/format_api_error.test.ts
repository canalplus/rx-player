import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import formatApiError from "../../../../../src/errors/public_api/format_api_error.ts";
import OtherError from "../../../../../src/errors/public_api/other_error.ts";

const mocks = vi.hoisted(() => {
  return {
    isApiError: vi.fn(),
  };
});

vi.mock("../../../../../src/errors/utils/is_api_error.ts", () => {
  return {
    default: mocks.isApiError,
  };
});
describe("errors - formatApiError", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    mocks.isApiError.mockReset();
  });

  it("should just return the error if it is a Custom Error", () => {
    mocks.isApiError.mockImplementation(() => true);
    const error1 = new Error("Aaaaaa");
    expect(formatApiError(error1, { defaultCode: "NONE", defaultReason: "a" })).toBe(
      error1,
    );
  });

  it("should stringify error if it is an Error but not a Custom Error", () => {
    mocks.isApiError.mockImplementation(() => false);
    const error1 = new Error("Abcdef");
    const formattedError = formatApiError(error1, {
      defaultCode: "NONE",
      defaultReason: "a",
    });
    expect(formattedError).toBeInstanceOf(OtherError);
    expect(formattedError.message).toBe("NONE: Error: Abcdef");
    expect(formattedError.code).toBe("NONE");
  });

  it("should stringify error if it is an Error but not a Custom Error", () => {
    mocks.isApiError.mockImplementation(() => false);
    const error1 = {};
    const formattedError = formatApiError(error1, {
      defaultCode: "NONE",
      defaultReason: "a",
    });
    expect(formattedError).toBeInstanceOf(OtherError);
    expect(formattedError.message).toBe("NONE: a");
    expect(formattedError.code).toBe("NONE");
  });
});
