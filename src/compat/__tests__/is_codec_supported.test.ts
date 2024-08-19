import { describe, beforeEach, it, expect, vi } from "vitest";
import type IIsCodecSupported from "../is_codec_supported";

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
    const isCodecSupported = (await vi.importActual("../is_codec_supported"))
      .default as typeof IIsCodecSupported;
    expect(isCodecSupported("foo")).toEqual(false);
    expect(isCodecSupported("")).toEqual(false);
  });

  it("should return true in any case if the MediaSource does not have the right function", async () => {
    vi.doMock("../browser_compatibility_types", () => {
      return {
        MediaSource_: { isTypeSupported: undefined },
      };
    });
    const isCodecSupported = (await vi.importActual("../is_codec_supported"))
      .default as typeof IIsCodecSupported;
    expect(isCodecSupported("foo")).toEqual(true);
    expect(isCodecSupported("")).toEqual(true);
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
    const isCodecSupported = (await vi.importActual("../is_codec_supported"))
      .default as typeof IIsCodecSupported;
    expect(isCodecSupported("foo")).toEqual(true);
    expect(isCodecSupported("")).toEqual(true);
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
    const isCodecSupported = (await vi.importActual("../is_codec_supported"))
      .default as typeof IIsCodecSupported;
    expect(isCodecSupported("foo")).toEqual(false);
    expect(isCodecSupported("")).toEqual(false);
  });
});
