/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describe("Compat - canReuseMediaKeys", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("should return true on any browser but WebOS", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const, isWebOs: false };
    });
    const canReuseMediaKeys = jest.requireActual("../can_reuse_media_keys.ts");
    expect(canReuseMediaKeys.default()).toBe(true);
  });

  it("should return false on WebOs", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const, isWebOs: true, isWebOs2022: false };
    });
    const canReuseMediaKeys = jest.requireActual("../can_reuse_media_keys.ts");
    expect(canReuseMediaKeys.default()).toBe(false);
  });
});
