import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("errors - formatError", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should just return the error if it is a Custom Error", async () => {
    vi.doMock("../is_known_error", () => ({
      default: () => true,
    }));
    const formatError = ((await vi.importActual("../format_error")) as any).default;
    const error1 = new Error("Aaaaaa");
    expect(formatError(error1, { defaultCode: "toto", defaultReason: "a" })).toBe(error1);
  });

  it("should stringify error if it is an Error but not a Custom Error", async () => {
    vi.doMock("../is_known_error", () => ({
      default: () => false,
    }));
    const OtherError = ((await vi.importActual("../other_error")) as any).default;
    const formatError = ((await vi.importActual("../format_error")) as any).default;
    const error1 = new Error("Abcdef");
    const formattedError = formatError(error1, {
      defaultCode: "toto",
      defaultReason: "a",
    });
    expect(formattedError).toBeInstanceOf(OtherError);
    expect(formattedError.message).toBe("toto: Error: Abcdef");
    expect(formattedError.code).toBe("toto");
  });

  it("should stringify error if it is an Error but not a Custom Error", async () => {
    vi.doMock("../is_known_error", () => ({
      default: () => false,
    }));
    const OtherError = ((await vi.importActual("../other_error")) as any).default;
    const formatError = ((await vi.importActual("../format_error")) as any).default;
    const error1 = {};
    const formattedError = formatError(error1, {
      defaultCode: "toto",
      defaultReason: "a",
    });
    expect(formattedError).toBeInstanceOf(OtherError);
    expect(formattedError.message).toBe("toto: a");
    expect(formattedError.code).toBe("toto");
  });
});
