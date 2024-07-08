import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("Compat - isCodecSupported", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return false if MediaSource is not supported in the current device", async () => {
    vi.doMock("../browser_compatibility_types", () => {
      return {
        MediaSource_: undefined,
      };
    });
    const isCodecSupported = (await vi.importActual("../is_codec_supported")) as any;
    expect(isCodecSupported.default("foo")).toEqual(false);
    expect(isCodecSupported.default("")).toEqual(false);
  });

  it("should return true in any case if the MediaSource does not have the right function", async () => {
    vi.doMock("../browser_compatibility_types", () => {
      return {
        MediaSource_: { isTypeSupported: undefined },
      };
    });
    const isCodecSupported = (await vi.importActual("../is_codec_supported")) as any;
    expect(isCodecSupported.default("foo")).toEqual(true);
    expect(isCodecSupported.default("")).toEqual(true);
  });

  it("should return true if MediaSource.isTypeSupported returns true", async () => {
    vi.doMock("../browser_compatibility_types", () => {
      return {
        MediaSource_: {
          isTypeSupported(_codec: string) {
            return true;
          },
        },
      };
    });
    const isCodecSupported = (await vi.importActual("../is_codec_supported")) as any;
    expect(isCodecSupported.default("foo")).toEqual(true);
    expect(isCodecSupported.default("")).toEqual(true);
  });

  it("should return false if MediaSource.isTypeSupported returns false", async () => {
    vi.doMock("../browser_compatibility_types", () => {
      return {
        MediaSource_: {
          isTypeSupported(_codec: string) {
            return false;
          },
        },
      };
    });
    const isCodecSupported = (await vi.importActual("../is_codec_supported")) as any;
    expect(isCodecSupported.default("foo")).toEqual(false);
    expect(isCodecSupported.default("")).toEqual(false);
  });
});
