import { describe, afterEach, it, expect, vi } from "vitest";
import type IEnvDetector from "../browser_detection";
import type ICanReuseMediaKeys from "../can_reuse_media_keys";

describe("Compat - canReuseMediaKeys", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("should return true on most browsers", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.OtherIeOrEdgePreEdgeChromium,
          device: EnvDetector.DEVICES.Xbox,
        },
      };
    });
    const canReuseMediaKeys = (await vi.importActual("../can_reuse_media_keys.ts"))
      .default as typeof ICanReuseMediaKeys;
    expect(canReuseMediaKeys()).toBe(true);
  });

  it("should return false on WebOs2022", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Other,
          device: EnvDetector.DEVICES.WebOs2022,
        },
      };
    });
    const canReuseMediaKeys = (await vi.importActual("../can_reuse_media_keys.ts"))
      .default as typeof ICanReuseMediaKeys;
    expect(canReuseMediaKeys()).toBe(false);
  });

  it("should return false on WebOs2021", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Other,
          device: EnvDetector.DEVICES.WebOs2021,
        },
      };
    });
    const canReuseMediaKeys = (await vi.importActual("../can_reuse_media_keys.ts"))
      .default as typeof ICanReuseMediaKeys;
    expect(canReuseMediaKeys()).toBe(false);
  });

  it("should return false on other WebOS", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Other,
          device: EnvDetector.DEVICES.WebOsOther,
        },
      };
    });
    const canReuseMediaKeys = (await vi.importActual("../can_reuse_media_keys.ts"))
      .default as typeof ICanReuseMediaKeys;
    expect(canReuseMediaKeys()).toBe(false);
  });

  it("should return false on Panasonic", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Other,
          device: EnvDetector.DEVICES.Panasonic,
        },
      };
    });
    const canReuseMediaKeys = (await vi.importActual("../can_reuse_media_keys.ts"))
      .default as typeof ICanReuseMediaKeys;
    expect(canReuseMediaKeys()).toBe(false);
  });

  it("should return false on Philips' NETTV", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Other,
          device: EnvDetector.DEVICES.PhilipsNetTv,
        },
      };
    });
    const canReuseMediaKeys = (await vi.importActual("../can_reuse_media_keys.ts"))
      .default as typeof ICanReuseMediaKeys;
    expect(canReuseMediaKeys()).toBe(false);
  });

  it("should return false on A1 KSTB 40xxx", async () => {
    vi.doMock("../browser_detection", async () => {
      const EnvDetector = (await vi.importActual("../browser_detection"))
        .default as typeof IEnvDetector;
      return {
        default: {
          ...EnvDetector,
          browser: EnvDetector.BROWSERS.Other,
          device: EnvDetector.DEVICES.A1KStb40xx,
        },
      };
    });
    const canReuseMediaKeys = (await vi.importActual("../can_reuse_media_keys.ts"))
      .default as typeof ICanReuseMediaKeys;
    expect(canReuseMediaKeys()).toBe(false);
  });
});
