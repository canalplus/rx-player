import { describe, beforeEach, it, expect, vi } from "vitest";
import type { IMediaSourceClass } from "../browser_compatibility_types.ts";
import isCodecSupported from "../is_codec_supported.ts";

describe("Compat - isCodecSupported", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return false if MediaSource is not supported in the current device", async () => {
    expect(isCodecSupported(null, "foo")).toEqual(false);
    expect(isCodecSupported(null, "")).toEqual(false);
  });

  it("should return true in any case if the MediaSource does not have the right function", async () => {
    expect(
      isCodecSupported(
        { isCodecSupported: undefined } as unknown as IMediaSourceClass,
        "foo",
      ),
    ).toEqual(true);
    expect(
      isCodecSupported(
        { isCodecSupported: undefined } as unknown as IMediaSourceClass,
        "",
      ),
    ).toEqual(true);
  });

  it("should return true if MediaSource.isTypeSupported returns true", async () => {
    const MediaSourceClass = {
      isTypeSupported(_codec: string) {
        return true;
      },
    };
    expect(
      isCodecSupported(MediaSourceClass as unknown as IMediaSourceClass, "foo"),
    ).toEqual(true);
    expect(
      isCodecSupported(MediaSourceClass as unknown as IMediaSourceClass, ""),
    ).toEqual(true);
  });

  it("should return false if MediaSource.isTypeSupported returns false", async () => {
    const MediaSourceClass = {
      isTypeSupported(_codec: string) {
        return false;
      },
    };
    expect(
      isCodecSupported(MediaSourceClass as unknown as IMediaSourceClass, "foo-false"),
    ).toEqual(false);
    expect(
      isCodecSupported(MediaSourceClass as unknown as IMediaSourceClass, "empty-false"),
    ).toEqual(false);
  });
});
