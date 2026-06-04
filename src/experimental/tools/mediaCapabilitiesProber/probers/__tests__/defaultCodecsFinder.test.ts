import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import {
  findDefaultVideoCodec,
  findDefaultAudioCodec,
} from "../../probers/defaultCodecsFinder";

type IMockedMediaSource = {
  isTypeSupported?: ((codec: string) => boolean) | undefined;
} | null;

const mocks: { default: { MediaSource_: IMockedMediaSource } } = vi.hoisted(() => {
  return {
    default: {
      MediaSource_: {},
    },
  };
});

vi.mock("../../../../../compat/browser_compatibility_types", () => {
  return mocks;
});

describe("MediaCapabilitiesProber probers - findDefaultVideoCodec", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    mocks.default.MediaSource_ = {};
  });

  it("should find default video codec", () => {
    const mockIsTypeSupported = vi.fn((codec: string) => {
      return (
        codec === 'video/mp4;codecs="avc1.4d401e"' ||
        codec === 'video/mp4;codecs="avc1.42e01e"' ||
        codec === 'video/webm;codecs="vp8"'
      );
    });

    mocks.default.MediaSource_ = {
      isTypeSupported: mockIsTypeSupported,
    };
    expect(findDefaultVideoCodec()).toBe('video/mp4;codecs="avc1.4d401e"');
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should not find default video codec", () => {
    const mockIsTypeSupported = vi.fn(() => false);
    mocks.default.MediaSource_ = {
      isTypeSupported: mockIsTypeSupported,
    };
    expect(() => {
      findDefaultVideoCodec();
    }).toThrowError("No default video codec found.");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(4);
  });

  it("should throw because no MediaSource", () => {
    mocks.default.MediaSource_ = null;
    expect(() => {
      findDefaultVideoCodec();
    }).toThrowError("Cannot check video codec support: No API available.");
  });

  it("should throw because no isTypeSupported", () => {
    mocks.default.MediaSource_ = {};
    expect(() => {
      findDefaultVideoCodec();
    }).toThrowError("Cannot check video codec support: No API available.");
  });
});

describe("MediaCapabilitiesProber probers - findDefaultAudioCodec", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should find default audio codec", () => {
    const mockIsTypeSupported = vi.fn((codec: string) => {
      return (
        codec === 'audio/mp4;codecs="mp4a.40.2"' || codec === 'audio/webm;codecs="opus"'
      );
    });
    mocks.default.MediaSource_ = {
      isTypeSupported: mockIsTypeSupported,
    };
    expect(findDefaultAudioCodec()).toBe('audio/mp4;codecs="mp4a.40.2"');
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should not find default audio codec", () => {
    const mockIsTypeSupported = vi.fn(() => false);
    mocks.default.MediaSource_ = {
      isTypeSupported: mockIsTypeSupported,
    };
    expect(() => {
      findDefaultAudioCodec();
    }).toThrowError("No default audio codec found.");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(2);
  });

  it("should throw because no MediaSource", () => {
    mocks.default.MediaSource_ = null;
    expect(() => {
      findDefaultAudioCodec();
    }).toThrowError("Cannot check audio codec support: No API available.");
  });

  it("should throw because no isTypeSupported", () => {
    mocks.default.MediaSource_ = {};
    expect(() => {
      findDefaultAudioCodec();
    }).toThrow("Cannot check audio codec support: No API available.");
  });
});
