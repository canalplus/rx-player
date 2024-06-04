import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import probeDecodingInfos from "../../probers/decodingInfo";
import type { IMediaConfiguration } from "../../types";
import { ProberStatus } from "../../types";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */

const origDecodingInfo = (navigator as any).mediaCapabilities;
const origMediaCapabilities = (navigator as any).mediaCapabilities;

/**
 * Stub decodingInfo API to resolve.
 * @param {boolean} isSupported
 * @param {undefined|boolean} mustReject
 */
function stubDecodingInfo(isSupported: boolean, mustReject?: boolean) {
  const decodingInfoStub = vi.fn(() => {
    if (mustReject === true) {
      return Promise.reject();
    } else {
      return Promise.resolve({
        supported: isSupported,
      });
    }
  });

  const mockMediaCapabilities = {
    decodingInfo: decodingInfoStub,
  };

  (navigator as any).mediaCapabilities = mockMediaCapabilities;
  return decodingInfoStub;
}

/**
 * Reset decodingInfo to native implementation.
 */
function resetDecodingInfos(): void {
  (navigator as any).mediaCapabilities = origDecodingInfo;
}

describe("MediaCapabilitiesProber probers - decodingInfo", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    (navigator as any).mediaCapabilities = origMediaCapabilities;
  });

  it("should throw if no video and audio config", () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      type: "media-source" as const,
    };

    expect.assertions(2);
    return probeDecodingInfos(configuration)
      .then(() => {
        resetDecodingInfos();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toEqual(
          "MediaCapabilitiesProber >>> API_CALL: " +
            "Not enough arguments for calling mediaCapabilites.",
        );
        expect(decodingInfoStub).not.toHaveBeenCalled();
        resetDecodingInfos();
      });
  });

  it("should throw if incomplete video config", () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      type: "media-source" as const,
      video: {
        contentType: "video/wmv",
      },
    };

    expect.assertions(2);
    return probeDecodingInfos(configuration)
      .then(() => {
        resetDecodingInfos();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toEqual(
          "MediaCapabilitiesProber >>> API_CALL: " +
            "Not enough arguments for calling mediaCapabilites.",
        );
        expect(decodingInfoStub).not.toHaveBeenCalled();
        resetDecodingInfos();
      });
  });

  it("should throw if incomplete audio config", () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      type: "media-source" as const,
      audio: {
        contentType: "audio/wma",
      },
    };

    expect.assertions(2);
    return probeDecodingInfos(configuration)
      .then(() => {
        resetDecodingInfos();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toEqual(
          "MediaCapabilitiesProber >>> API_CALL: " +
            "Not enough arguments for calling mediaCapabilites.",
        );
        expect(decodingInfoStub).not.toHaveBeenCalled();
        resetDecodingInfos();
      });
  });

  it("should throw if no type in config", () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      audio: {
        contentType: "audio/wma",
      },
    };
    expect.assertions(2);
    return probeDecodingInfos(configuration)
      .then(() => {
        resetDecodingInfos();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toEqual(
          "MediaCapabilitiesProber >>> API_CALL: " +
            "Not enough arguments for calling mediaCapabilites.",
        );
        expect(decodingInfoStub).not.toHaveBeenCalled();
        resetDecodingInfos();
      });
  });

  it("should throw if empty config", () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {};

    expect.assertions(2);
    return probeDecodingInfos(configuration)
      .then(() => {
        resetDecodingInfos();
      })
      .catch(({ message }: { message: string }) => {
        expect(message).toEqual(
          "MediaCapabilitiesProber >>> API_CALL: " +
            "Not enough arguments for calling mediaCapabilites.",
        );
        expect(decodingInfoStub).not.toHaveBeenCalled();
        resetDecodingInfos();
      });
  });

  it("should throw if API mediaCapabilities not available", () => {
    delete (navigator as any).mediaCapabilities;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeDecodingInfos({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: MediaCapabilities API not available",
    );
    /* eslint-enable @typescript-eslint/no-floating-promises */
  });

  it("should throw if API decodingInfo not available", () => {
    if ((navigator as any).mediaCapabilities) {
      delete (navigator as any).mediaCapabilities.decodingInfo;
    } else {
      (navigator as any).mediaCapabilities = {};
    }
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeDecodingInfos({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: Decoding Info not available",
    );
    /* eslint-enable @typescript-eslint/no-floating-promises */
  });

  it("should resolve with `Supported` if decodingInfo supports (video only)", () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "audio/wma",
        bitrate: 5000,
        framerate: "24",
        height: 1080,
        width: 1920,
      },
    };

    expect.assertions(2);
    return probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.Supported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
      })
      .catch(() => {
        resetDecodingInfos();
      });
  });

  it("should resolve with `Supported` if decodingInfo supports (audio only)", () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
        bitrate: 5000,
        samplerate: 44100,
        channels: "5.1",
      },
    };

    expect.assertions(2);
    return probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.Supported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
      })
      .catch(() => {
        resetDecodingInfos();
      });
  });

  it("should resolve with `Supported` if decodingInfo supports video + audio", () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "audio/wma",
        bitrate: 5000,
        framerate: "24",
        height: 1080,
        width: 1920,
      },
      audio: {
        contentType: "audio/wma",
        bitrate: 5000,
        samplerate: 44100,
        channels: "5.1",
      },
    };
    expect.assertions(2);
    return probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.Supported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
      })
      .catch(() => {
        resetDecodingInfos();
      });
  });

  it("should return `NotSupported` if no decodingInfo support (video only)", () => {
    const decodingInfoStub = stubDecodingInfo(false);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "audio/wma",
        bitrate: 5000,
        framerate: "24",
        height: 1080,
        width: 1920,
      },
    };
    expect.assertions(2);
    return probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.NotSupported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
      })
      .catch(() => {
        resetDecodingInfos();
      });
  });

  it("should return `NotSupported` if no decodingInfo support (audio only)", () => {
    const decodingInfoStub = stubDecodingInfo(false);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
        bitrate: 5000,
        samplerate: 44100,
        channels: "5.1",
      },
    };
    expect.assertions(2);
    return probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.NotSupported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
      })
      .catch(() => {
        resetDecodingInfos();
      });
  });

  it("should return `NotSupported` if no decodingInfo support", () => {
    const decodingInfoStub = stubDecodingInfo(false);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "audio/wma",
        bitrate: 5000,
        framerate: "24",
        height: 1080,
        width: 1920,
      },
      audio: {
        contentType: "audio/wma",
        bitrate: 5000,
        samplerate: 44100,
        channels: "5.1",
      },
    };
    expect.assertions(2);
    return probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.NotSupported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
      })
      .catch(() => {
        resetDecodingInfos();
      });
  });

  it("should resolve with `NotSupported` if decodingInfo throws", () => {
    const decodingInfoStub = stubDecodingInfo(true, true);
    const configuration: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "audio/wma",
        bitrate: 5000,
        framerate: "24",
        height: 1080,
        width: 1920,
      },
      audio: {
        contentType: "audio/wma",
        bitrate: 5000,
        samplerate: 44100,
        channels: "5.1",
      },
    };
    expect.assertions(2);
    return probeDecodingInfos(configuration)
      .then(([res]) => {
        expect(res).toBe(ProberStatus.NotSupported);
        expect(decodingInfoStub).toHaveBeenCalledTimes(1);
        resetDecodingInfos();
      })
      .catch(() => {
        resetDecodingInfos();
      });
  });
});
