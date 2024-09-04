import { describe, beforeEach, it, expect, vi } from "vitest";
import type IFormatError from "../format_error";

describe("errors - formatError", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should just return the error if it is a Custom Error", async () => {
    vi.doMock("../is_known_error", () => ({
      default: () => true,
    }));
    const formatError = (await vi.importActual("../format_error"))
      .default as typeof IFormatError;
    const error1 = new Error("Aaaaaa");
    expect(formatError(error1, { defaultCode: "NONE", defaultReason: "a" })).toBe(error1);
  });

  it("should stringify error if it is an Error but not a Custom Error", async () => {
    vi.doMock("../is_known_error", () => ({
      default: () => false,
    }));
    const OtherError = (await vi.importActual("../other_error"))
      .default as typeof IFormatError;
    const formatError = (await vi.importActual("../format_error"))
      .default as typeof IFormatError;
    const error1 = new Error("Abcdef");
    const formattedError = formatError(error1, {
      defaultCode: "NONE",
      defaultReason: "a",
    });
    expect(formattedError).toBeInstanceOf(OtherError);
    expect(formattedError.message).toBe("NONE: Error: Abcdef");
    expect(formattedError.code).toBe("NONE");
  });

  it("should stringify error if it is an Error but not a Custom Error", async () => {
    vi.doMock("../is_known_error", () => ({
      default: () => false,
    }));
    const OtherError = (await vi.importActual("../other_error"))
      .default as typeof IFormatError;
    const formatError = (await vi.importActual("../format_error"))
      .default as typeof IFormatError;
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
