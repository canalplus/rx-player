/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describe("Compat - canReuseMediaKeys", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("should return true on any browser but WebOS 2021 and 2022", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isWebOs2021: false,
               isWebOs2022: false };
    });
    const canReuseMediaKeys =
      jest.requireActual("../can_reuse_media_keys.ts");
    expect(canReuseMediaKeys.default()).toBe(true);
  });

  it("should return false on WebOs 2021", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isWebOs2021: true,
               isWebOs2022: false };
    });
    const canReuseMediaKeys =
      jest.requireActual("../can_reuse_media_keys.ts");
    expect(canReuseMediaKeys.default()).toBe(false);
  });

  it("should return false on WebOs 2022", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isWebOs2021: false,
               isWebOs2022: true };
    });
    const canReuseMediaKeys =
      jest.requireActual("../can_reuse_media_keys.ts");
    expect(canReuseMediaKeys.default()).toBe(false);
  });

  it("should return false in the improbable case of both WebOs 2021 and 2022", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isWebOs2021: true,
               isWebOs2022: true };
    });
    const canReuseMediaKeys =
      jest.requireActual("../can_reuse_media_keys.ts");
    expect(canReuseMediaKeys.default()).toBe(false);
  });
});
