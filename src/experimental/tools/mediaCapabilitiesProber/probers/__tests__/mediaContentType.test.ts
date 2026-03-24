import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import probeMediaContentType from "../../probers/mediaContentType";
import type { IMediaConfiguration } from "../../types";

const mocks = vi.hoisted(() => {
  return {
    default: {
      MediaSource_: {} as unknown,
    },
  };
});

vi.mock("../../../../../compat/browser_compatibility_types", () => {
  return mocks;
});

describe("MediaCapabilitiesProber - probers probeMediaContentType", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    mocks.default.MediaSource_ = {};
  });

  it("should throw if no compatible MediaSource API", async () => {
    mocks.default.MediaSource_ = null;
    expect(() => probeMediaContentType({})).toThrowError("MediaSource API not available");
  });

  it("should throw if no compatible isTypeSupported API", async () => {
    mocks.default.MediaSource_ = {
      isTypeSupported: false,
    };
    expect(() => probeMediaContentType({})).toThrowError(
      "MediaSource.isTypeSupported API not available",
    );
  });

  it("should throw if no specified contentType in config", async () => {
    const mockIsTypeSupported = vi.fn(() => true);
    mocks.default.MediaSource_ = {
      isTypeSupported: mockIsTypeSupported,
    };
    const config: IMediaConfiguration = {
      type: "media-source",
    };

    expect.assertions(1);
    expect(() => probeMediaContentType(config)).toThrowError(
      "Not enough arguments for calling isTypeSupported.",
    );
  });

  it("should return `Supported` when video contentType is supported", async () => {
    const mockIsTypeSupported = vi.fn(() => true);
    mocks.default.MediaSource_ = {
      isTypeSupported: mockIsTypeSupported,
    };
    const config: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
    };

    expect.assertions(2);
    expect(probeMediaContentType(config)).toEqual("Supported");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should return `Supported` when audio contentType is supported", async () => {
    const mockIsTypeSupported = vi.fn(() => true);
    mocks.default.MediaSource_ = {
      isTypeSupported: mockIsTypeSupported,
    };
    const config: IMediaConfiguration = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
      },
    };

    expect.assertions(2);
    expect(probeMediaContentType(config)).toEqual("Supported");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should return `Supported` when both contentTypes are supported", async () => {
    const mockIsTypeSupported = vi.fn(() => true);
    mocks.default.MediaSource_ = {
      isTypeSupported: mockIsTypeSupported,
    };
    const config: IMediaConfiguration = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
      },
      video: {
        contentType: "video/mp5",
      },
    };

    expect(probeMediaContentType(config)).toEqual("Supported");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(2);
  });

  it("should return `NotSupported` when audio contentType is not supported", async () => {
    const mockIsTypeSupported = vi.fn(() => false);
    mocks.default.MediaSource_ = {
      isTypeSupported: mockIsTypeSupported,
    };
    const config: IMediaConfiguration = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
      },
    };

    expect.assertions(2);
    expect(probeMediaContentType(config)).toEqual("NotSupported");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should return `NotSupported` when video contentType is not supported", async () => {
    const mockIsTypeSupported = vi.fn(() => false);
    mocks.default.MediaSource_ = {
      isTypeSupported: mockIsTypeSupported,
    };
    const config: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
    };

    expect.assertions(2);
    expect(probeMediaContentType(config)).toEqual("NotSupported");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should return `NotSupported` when contentTypes are not supported", async () => {
    const mockIsTypeSupported = vi.fn(() => false);
    mocks.default.MediaSource_ = {
      isTypeSupported: mockIsTypeSupported,
    };
    const config: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
      audio: {
        contentType: "audio/wma",
      },
    };

    expect.assertions(2);
    expect(probeMediaContentType(config)).toEqual("NotSupported");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should return `NotSupported` when one contentType is not supported", async () => {
    const mockIsTypeSupported = vi.fn((type: string) => {
      return type === "video/mp5";
    });
    mocks.default.MediaSource_ = {
      isTypeSupported: mockIsTypeSupported,
    };
    const config: IMediaConfiguration = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
      audio: {
        contentType: "audio/wma",
      },
    };

    expect.assertions(2);
    expect(probeMediaContentType(config)).toEqual("NotSupported");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(2);
  });
});
