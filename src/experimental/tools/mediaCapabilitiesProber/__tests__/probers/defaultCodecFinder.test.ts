import { describe, beforeEach, it, expect, vi } from "vitest";
import type {
  findDefaultVideoCodec as IFindDefaultVideoCodec,
  findDefaultAudioCodec as IFindDefaultAudioCodec,
} from "../../probers/defaultCodecsFinder";

describe("MediaCapabilitiesProber probers - findDefaultVideoCodec", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should find default video codec", async () => {
    const mockIsTypeSupported = vi.fn((codec: string) => {
      return (
        codec === 'video/mp4;codecs="avc1.4d401e"' ||
        codec === 'video/mp4;codecs="avc1.42e01e"' ||
        codec === 'video/webm;codecs="vp8"'
      );
    });
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const findDefaultVideoCodec = (
      await vi.importActual("../../probers/defaultCodecsFinder")
    ).findDefaultVideoCodec as typeof IFindDefaultVideoCodec;
    expect(findDefaultVideoCodec()).toBe('video/mp4;codecs="avc1.4d401e"');
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should not find default video codec", async () => {
    const mockIsTypeSupported = vi.fn(() => false);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const findDefaultVideoCodec = (
      await vi.importActual("../../probers/defaultCodecsFinder")
    ).findDefaultVideoCodec as typeof IFindDefaultVideoCodec;
    expect(() => {
      findDefaultVideoCodec();
    }).toThrowError("No default video codec found.");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(4);
  });

  it("should throw because no MediaSource", async () => {
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: null,
    }));
    const findDefaultVideoCodec = (
      await vi.importActual("../../probers/defaultCodecsFinder")
    ).findDefaultVideoCodec as typeof IFindDefaultVideoCodec;
    expect(() => {
      findDefaultVideoCodec();
    }).toThrowError("Cannot check video codec support: No API available.");
  });

  it("should throw because no isTypeSupported", async () => {
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {},
    }));
    const findDefaultVideoCodec = (
      await vi.importActual("../../probers/defaultCodecsFinder")
    ).findDefaultVideoCodec as typeof IFindDefaultVideoCodec;
    expect(() => {
      findDefaultVideoCodec();
    }).toThrowError("Cannot check video codec support: No API available.");
  });
});

describe("MediaCapabilitiesProber probers - findDefaultAudioCodec", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should find default audio codec", async () => {
    const mockIsTypeSupported = vi.fn((codec: string) => {
      return (
        codec === 'audio/mp4;codecs="mp4a.40.2"' || codec === "audio/webm;codecs=opus"
      );
    });
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const findDefaultAudioCodec = (
      await vi.importActual("../../probers/defaultCodecsFinder")
    ).findDefaultAudioCodec as typeof IFindDefaultAudioCodec;
    expect(findDefaultAudioCodec()).toBe('audio/mp4;codecs="mp4a.40.2"');
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should not find default audio codec", async () => {
    const mockIsTypeSupported = vi.fn(() => false);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const findDefaultAudioCodec = (
      await vi.importActual("../../probers/defaultCodecsFinder")
    ).findDefaultAudioCodec as typeof IFindDefaultAudioCodec;
    expect(() => {
      findDefaultAudioCodec();
    }).toThrowError("No default audio codec found.");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(2);
  });

  it("should throw because no MediaSource", async () => {
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: null,
    }));
    const findDefaultAudioCodec = (
      await vi.importActual("../../probers/defaultCodecsFinder")
    ).findDefaultAudioCodec as typeof IFindDefaultAudioCodec;
    expect(() => {
      findDefaultAudioCodec();
    }).toThrowError("Cannot check audio codec support: No API available.");
  });

  it("should throw because no isTypeSupported", async () => {
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {},
    }));
    const findDefaultAudioCodec = (
      await vi.importActual("../../probers/defaultCodecsFinder")
    ).findDefaultAudioCodec as typeof IFindDefaultAudioCodec;
    expect(() => {
      findDefaultAudioCodec();
    }).toThrow("Cannot check audio codec support: No API available.");
  });
});
