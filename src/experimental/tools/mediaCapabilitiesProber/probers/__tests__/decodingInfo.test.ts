import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import isNullOrUndefined from "../../../../../utils/is_null_or_undefined";
import probeDecodingInfos from "../../probers/decodingInfo";
import type { IMediaConfiguration } from "../../types";

const origDecodingInfo = navigator.mediaCapabilities;
const origMediaCapabilities = navigator.mediaCapabilities;

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

  // @ts-expect-error: `navigator.mediaCapabilities` is read-only normally, for
  // now, we're going through JSDom through so that's OK.
  navigator.mediaCapabilities = mockMediaCapabilities;
  return decodingInfoStub;
}

/**
 * Reset decodingInfo to native implementation.
 */
function resetDecodingInfos(): void {
  // @ts-expect-error: `navigator.mediaCapabilities` is read-only normally, for
  // now, we're going through JSDom through so that's OK.
  navigator.mediaCapabilities = origDecodingInfo;
}

describe("MediaCapabilitiesProber probers - decodingInfo", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    // @ts-expect-error: `navigator.mediaCapabilities` is read-only normally, for
    // now, we're going through JSDom through so that's OK.
    navigator.mediaCapabilities = origMediaCapabilities;
  });

  it("should throw if no video and audio config", async () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      type: "media-source" as const,
    };

    let thrownException = false;
    try {
      await probeDecodingInfos(configuration);
      resetDecodingInfos();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      thrownException = true;
      expect(message).toEqual("Not enough arguments for calling mediaCapabilites.");
      expect(decodingInfoStub).not.toHaveBeenCalled();
      resetDecodingInfos();
    }
    expect(thrownException).toEqual(true);
  });

  it("should throw if incomplete video config", async () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      type: "media-source" as const,
      video: {
        contentType: "video/wmv",
      },
    };

    let thrownException = false;
    try {
      await probeDecodingInfos(configuration);
      resetDecodingInfos();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      thrownException = true;
      expect(message).toEqual("Not enough arguments for calling mediaCapabilites.");
      expect(decodingInfoStub).not.toHaveBeenCalled();
      resetDecodingInfos();
    }
    expect(thrownException).toEqual(true);
  });

  it("should throw if incomplete audio config", async () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      type: "media-source" as const,
      audio: {
        contentType: "audio/wma",
      },
    };

    let thrownException = false;
    try {
      await probeDecodingInfos(configuration);
      resetDecodingInfos();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      thrownException = true;
      expect(message).toEqual("Not enough arguments for calling mediaCapabilites.");
      expect(decodingInfoStub).not.toHaveBeenCalled();
      resetDecodingInfos();
    }
    expect(thrownException).toEqual(true);
  });

  it("should throw if no type in config", async () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      audio: {
        contentType: "audio/wma",
      },
    };
    let thrownException = false;
    try {
      await probeDecodingInfos(configuration);
      resetDecodingInfos();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      thrownException = true;
      expect(message).toEqual("Not enough arguments for calling mediaCapabilites.");
      expect(decodingInfoStub).not.toHaveBeenCalled();
      resetDecodingInfos();
    }
    expect(thrownException).toEqual(true);
  });

  it("should throw if empty config", async () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {};

    let thrownException = false;
    try {
      await probeDecodingInfos(configuration);
      resetDecodingInfos();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      thrownException = true;
      expect(message).toEqual("Not enough arguments for calling mediaCapabilites.");
      expect(decodingInfoStub).not.toHaveBeenCalled();
      resetDecodingInfos();
    }
    expect(thrownException).toEqual(true);
  });

  it("should throw if API mediaCapabilities not available", () => {
    // @ts-expect-error: `navigator.mediaCapabilities` is read-only normally, for
    // now, we're going through JSDom through so that's OK.
    delete navigator.mediaCapabilities;
    return probeDecodingInfos({}).then(
      () => {
        throw new Error("Should not succeed");
      },
      (err: Error) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toEqual(
          "navigator.mediaCapabilites.decodingInfo is not available",
        );
      },
    );
  });

  it("should throw if API decodingInfo not available", () => {
    if (!isNullOrUndefined(navigator.mediaCapabilities)) {
      // @ts-expect-error: `navigator.mediaCapabilities` is read-only normally, for
      // now, we're going through JSDom through so that's OK.
      delete navigator.mediaCapabilities.decodingInfo;
    } else {
      // @ts-expect-error: `navigator.mediaCapabilities` is read-only normally, for
      // now, we're going through JSDom through so that's OK.
      navigator.mediaCapabilities = {};
    }
    return probeDecodingInfos({}).then(
      () => {
        throw new Error("Should not succeed");
      },
      (err: Error) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toEqual(
          "navigator.mediaCapabilites.decodingInfo is not available",
        );
      },
    );
  });

  it("should resolve with `Supported` if decodingInfo supports (video only)", async () => {
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

    const res = await probeDecodingInfos(configuration);
    expect(res).toBe("Supported");
    expect(decodingInfoStub).toHaveBeenCalledTimes(1);
    resetDecodingInfos();
  });

  it("should resolve with `Supported` if decodingInfo supports (audio only)", async () => {
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

    const res = await probeDecodingInfos(configuration);
    expect(res).toBe("Supported");
    expect(decodingInfoStub).toHaveBeenCalledTimes(1);
    resetDecodingInfos();
  });

  it("should resolve with `Supported` if decodingInfo supports video + audio", async () => {
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

    const res = await probeDecodingInfos(configuration);
    expect(res).toBe("Supported");
    expect(decodingInfoStub).toHaveBeenCalledTimes(1);
    resetDecodingInfos();
  });

  it("should return `NotSupported` if no decodingInfo support (video only)", async () => {
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

    const res = await probeDecodingInfos(configuration);
    expect(res).toBe("NotSupported");
    expect(decodingInfoStub).toHaveBeenCalledTimes(1);
    resetDecodingInfos();
  });

  it("should return `NotSupported` if no decodingInfo support (audio only)", async () => {
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

    const res = await probeDecodingInfos(configuration);
    expect(res).toBe("NotSupported");
    expect(decodingInfoStub).toHaveBeenCalledTimes(1);
    resetDecodingInfos();
  });

  it("should return `NotSupported` if no decodingInfo support", async () => {
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

    const res = await probeDecodingInfos(configuration);
    expect(res).toBe("NotSupported");
    expect(decodingInfoStub).toHaveBeenCalledTimes(1);
    resetDecodingInfos();
  });

  it("should resolve with `NotSupported` if decodingInfo throws", async () => {
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

    const res = await probeDecodingInfos(configuration);
    expect(res).toBe("NotSupported");
    expect(decodingInfoStub).toHaveBeenCalledTimes(1);
    resetDecodingInfos();
  });
});
