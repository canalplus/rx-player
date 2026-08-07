import { describe, beforeEach, it, expect, vi } from "vitest";
import type {
  IMediaSource,
  IMediaSourceClass,
  ISourceBuffer,
  ISourceBufferList,
} from "../../../../src/compat/browser_compatibility_types.ts";
import isCodecSupported from "../../../../src/compat/is_codec_supported.ts";

class BaseMockMediaSource implements IMediaSource {
  static isTypeSupported(_codec: string): boolean {
    return true;
  }

  duration: number = 0;
  readyState: "closed" | "open" | "ended" = "closed";
  sourceBuffers: ISourceBufferList = {
    length: 0,
    onaddsourcebuffer: null,
    onremovesourcebuffer: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  onsourceopen = null;
  onsourceended = null;
  onsourceclose = null;

  addSourceBuffer(_type: string): ISourceBuffer {
    throw new Error("Not implemented");
  }
  clearLiveSeekableRange(): void {
    // noop
  }
  endOfStream(): void {
    // noop
  }
  removeSourceBuffer(_sb: ISourceBuffer): void {
    // noop
  }
  setLiveSeekableRange(_start: number, _end: number): void {
    // noop
  }
  addEventListener(): void {
    // noop
  }
  removeEventListener(): void {
    // noop
  }
}

describe("Compat - isCodecSupported", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return false if MediaSource is not supported in the current device", async () => {
    expect(isCodecSupported(null, "foo")).toEqual(false);
    expect(isCodecSupported(null, "")).toEqual(false);
  });

  it("should return true in any case if the MediaSource does not have the right function", async () => {
    class MediaSourceClass extends BaseMockMediaSource {}
    const checkedMediaSourceClass = MediaSourceClass satisfies IMediaSourceClass;
    Reflect.deleteProperty(MediaSourceClass, "isTypeSupported");
    expect(isCodecSupported(checkedMediaSourceClass, "foo")).toEqual(true);
    expect(isCodecSupported(checkedMediaSourceClass, "")).toEqual(true);
  });

  it("should return true if MediaSource.isTypeSupported returns true", async () => {
    class MediaSourceClass extends BaseMockMediaSource {
      static isTypeSupported(_codec: string): boolean {
        return true;
      }
    }
    const checkedMediaSourceClass = MediaSourceClass satisfies IMediaSourceClass;
    expect(isCodecSupported(checkedMediaSourceClass, "foo")).toEqual(true);
    expect(isCodecSupported(checkedMediaSourceClass, "")).toEqual(true);
  });

  it("should return false if MediaSource.isTypeSupported returns false", async () => {
    class MediaSourceClass extends BaseMockMediaSource {
      static isTypeSupported(_codec: string): boolean {
        return false;
      }
    }
    const checkedMediaSourceClass = MediaSourceClass satisfies IMediaSourceClass;
    expect(isCodecSupported(checkedMediaSourceClass, "foo-false")).toEqual(false);
    expect(isCodecSupported(checkedMediaSourceClass, "empty-false")).toEqual(false);
  });
});
