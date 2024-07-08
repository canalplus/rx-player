import { describe, beforeEach, it, expect, vi } from "vitest";
import { ProberStatus } from "../../types";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("MediaCapabilitiesProber - probers probeMediaContentType", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should throw if no compatible MediaSource API", async () => {
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: null,
    }));
    const probeMediaContentType = (
      (await vi.importActual("../../probers/mediaContentType")) as any
    ).default;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeMediaContentType({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: " + "MediaSource API not available",
    );
    /* eslint-enable @typescript-eslint/no-floating-promises */
  });

  it("should throw if no compatible isTypeSupported API", async () => {
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: false,
      },
    }));
    const probeMediaContentType = (
      (await vi.importActual("../../probers/mediaContentType")) as any
    ).default;
    /* eslint-disable @typescript-eslint/no-floating-promises */
    expect(probeMediaContentType({})).rejects.toThrowError(
      "MediaCapabilitiesProber >>> API_CALL: " + "isTypeSupported not available",
    );
    /* eslint-enable @typescript-eslint/no-floating-promises */
  });

  it("should throw if no specified contentType in config", async () => {
    const mockIsTypeSupported = vi.fn(() => true);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
    };
    const probeMediaContentType = (
      (await vi.importActual("../../probers/mediaContentType")) as any
    ).default;

    expect.assertions(1);
    await probeMediaContentType(config).catch(({ message }: { message: string }) => {
      expect(message).toBe(
        "MediaCapabilitiesProber >>> API_CALL: " +
          "Not enough arguments for calling isTypeSupported.",
      );
    });
  });

  it("should resolve with `Supported` when video contentType is supported", async () => {
    const mockIsTypeSupported = vi.fn(() => true);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
    };
    const probeMediaContentType = (
      (await vi.importActual("../../probers/mediaContentType")) as any
    ).default;

    expect.assertions(2);
    await probeMediaContentType(config)
      .then(([res]: [unknown]) => {
        expect(res).toEqual(ProberStatus.Supported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
      })
      .catch(() => {
        // noop
      });
  });

  it("should resolve with `Supported` when audio contentType is supported", async () => {
    const mockIsTypeSupported = vi.fn(() => true);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
      },
    };
    const probeMediaContentType = (
      (await vi.importActual("../../probers/mediaContentType")) as any
    ).default;

    expect.assertions(2);
    await probeMediaContentType(config)
      .then(([res]: [unknown]) => {
        expect(res).toEqual(ProberStatus.Supported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
      })
      .catch(() => {
        // noop
      });
  });

  it("should resolve with `Supported` when both contentTypes are supported", async () => {
    const mockIsTypeSupported = vi.fn(() => true);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
      },
      video: {
        contentType: "video/mp5",
      },
    };
    const probeMediaContentType = (
      (await vi.importActual("../../probers/mediaContentType")) as any
    ).default;

    expect.assertions(2);
    await probeMediaContentType(config)
      .then(([res]: [unknown]) => {
        expect(res).toEqual(ProberStatus.Supported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
      })
      .catch(() => {
        // noop
      });
  });

  it("should return `NotSupported` when audio contentType is not supported", async () => {
    const mockIsTypeSupported = vi.fn(() => false);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      audio: {
        contentType: "audio/wma",
      },
    };
    const probeMediaContentType = (
      (await vi.importActual("../../probers/mediaContentType")) as any
    ).default;

    expect.assertions(2);
    await probeMediaContentType(config)
      .then(([res]: [unknown]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
      })
      .catch(() => {
        // noop
      });
  });

  it("should return `NotSupported` when video contentType is not supported", async () => {
    const mockIsTypeSupported = vi.fn(() => false);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
    };
    const probeMediaContentType = (
      (await vi.importActual("../../probers/mediaContentType")) as any
    ).default;

    expect.assertions(2);
    await probeMediaContentType(config)
      .then(([res]: [unknown]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
      })
      .catch(() => {
        // noop
      });
  });

  it("should resolve with `NotSupported` when contentTypes are not supported", async () => {
    const mockIsTypeSupported = vi.fn(() => false);
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
      audio: {
        contentType: "audio/wma",
      },
    };
    const probeMediaContentType = (
      (await vi.importActual("../../probers/mediaContentType")) as any
    ).default;

    expect.assertions(2);
    await probeMediaContentType(config)
      .then(([res]: [unknown]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
      })
      .catch(() => {
        // noop
      });
  });

  it("should return `NotSupported` when one contentType is not supported", async () => {
    const mockIsTypeSupported = vi.fn((type: string) => {
      return type === "video/mp5";
    });
    vi.doMock("../../../../../compat/browser_compatibility_types", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const config = {
      type: "media-source",
      video: {
        contentType: "video/mp5",
      },
      audio: {
        contentType: "audio/wma",
      },
    };
    const probeMediaContentType = (
      (await vi.importActual("../../probers/mediaContentType")) as any
    ).default;

    expect.assertions(2);
    await probeMediaContentType(config)
      .then(([res]: [unknown]) => {
        expect(res).toEqual(ProberStatus.NotSupported);
        expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
      })
      .catch(() => {
        // noop
      });
  });
});
