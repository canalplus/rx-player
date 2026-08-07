import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import probeDecodingInfos from "../../../../../../../src/experimental/tools/mediaCapabilitiesProber/probers/decodingInfo.ts";
import type { IMediaConfiguration } from "../../../../../../../src/experimental/tools/mediaCapabilitiesProber/types.ts";
import globalScope from "../../../../../../../src/utils/global_scope.ts";

const oldNavigator = globalScope.navigator;

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
  } as unknown as MediaCapabilities;

  Object.defineProperty(navigator, "mediaCapabilities", {
    get() {
      return mockMediaCapabilities;
    },
  });
  return decodingInfoStub;
}

describe("MediaCapabilitiesProber probers - decodingInfo", () => {
  beforeEach(() => {
    vi.resetModules();

    // Ugly trick to authorize the resetting of the `navigator` property:
    //   1. We redefine what window.navigator points to so it can be modified.
    //      We don't care about its value here.
    //   2. We're now able to remove it from `window`.
    //   3. We now redefine it as an empty object.
    Object.defineProperty(globalScope, "navigator", {});
    // @ts-expect-error: part of the aforementioned trick
    delete globalScope.navigator;
    // @ts-expect-error: part of the aforementioned trick
    globalScope.navigator = {};
  });

  afterEach(() => {
    globalScope.navigator = oldNavigator;
  });

  it("should throw if no video and audio config", async () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {
      type: "media-source" as const,
    };

    let thrownException = false;
    try {
      await probeDecodingInfos(configuration);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      thrownException = true;
      expect(message).toEqual("Not enough arguments for calling mediaCapabilites.");
      expect(decodingInfoStub).not.toHaveBeenCalled();
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      thrownException = true;
      expect(message).toEqual("Not enough arguments for calling mediaCapabilites.");
      expect(decodingInfoStub).not.toHaveBeenCalled();
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      thrownException = true;
      expect(message).toEqual("Not enough arguments for calling mediaCapabilites.");
      expect(decodingInfoStub).not.toHaveBeenCalled();
    }
    expect(thrownException).toEqual(true);
    return probeDecodingInfos(configuration).catch(({ message }: { message: string }) => {
      expect(message).toEqual("Not enough arguments for calling mediaCapabilites.");
      expect(decodingInfoStub).not.toHaveBeenCalled();
    });
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      thrownException = true;
      expect(message).toEqual("Not enough arguments for calling mediaCapabilites.");
      expect(decodingInfoStub).not.toHaveBeenCalled();
    }
    expect(thrownException).toEqual(true);
  });

  it("should throw if empty config", async () => {
    const decodingInfoStub = stubDecodingInfo(true);
    const configuration = {};

    let thrownException = false;
    try {
      await probeDecodingInfos(configuration);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      thrownException = true;
      expect(message).toEqual("Not enough arguments for calling mediaCapabilites.");
      expect(decodingInfoStub).not.toHaveBeenCalled();
    }
    expect(thrownException).toEqual(true);
  });

  it("should throw if API mediaCapabilities not available", async () => {
    await expect(probeDecodingInfos({})).rejects.toThrowError(
      "navigator.mediaCapabilites.decodingInfo is not available",
    );
  });

  it("should throw if API decodingInfo not available", async () => {
    Object.defineProperty(navigator, "mediaCapabilities", {
      get() {
        return {};
      },
    });
    await expect(probeDecodingInfos({})).rejects.toThrowError(
      "navigator.mediaCapabilites.decodingInfo is not available",
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
  });
});
