/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describe("Compat - canReuseMediaKeys", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("should return true on most browsers", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isA1KStb40xx: false,
        isWebOs: false,
        isPhilipsNetTv: false,
        isPanasonic: false,
      };
    });
    const canReuseMediaKeys = jest.requireActual("../can_reuse_media_keys.ts");
    expect(canReuseMediaKeys.default()).toBe(true);
  });

  it("should return false on WebOs", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isA1KStb40xx: false,
        isWebOs: true,
        isWebOs2022: false,
        isPanasonic: false,
        isPhilipsNetTv: false,
      };
    });
    const canReuseMediaKeys = jest.requireActual("../can_reuse_media_keys.ts");
    expect(canReuseMediaKeys.default()).toBe(false);
  });

  it("should return false on Panasonic", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isA1KStb40xx: false,
        isWebOs: false,
        isWebOs2022: false,
        isPanasonic: true,
        isPhilipsNetTv: false,
      };
    });
    const canReuseMediaKeys = jest.requireActual("../can_reuse_media_keys.ts");
    expect(canReuseMediaKeys.default()).toBe(false);
  });

  it("should return false on Philips' NETTV", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isA1KStb40xx: false,
        isWebOs: false,
        isWebOs2022: false,
        isPanasonic: false,
        isPhilipsNetTv: true,
      };
    });
    const canReuseMediaKeys = jest.requireActual("../can_reuse_media_keys.ts");
    expect(canReuseMediaKeys.default()).toBe(false);
  });

  it("should return false on A1 KSTB 40xxx", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isA1KStb40xx: true,
        isWebOs: false,
        isWebOs2022: false,
        isPanasonic: false,
        isPhilipsNetTv: false,
      };
    });
    const canReuseMediaKeys = jest.requireActual("../can_reuse_media_keys.ts");
    expect(canReuseMediaKeys.default()).toBe(false);
  });
});
