import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("compat - shouldWaitForDataBeforeLoaded", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return true if we are not on Safari browser nor in directfile mode", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isSafariMobile: false,
      };
    });
    const shouldWaitForDataBeforeLoaded = (await vi.importActual(
      "../should_wait_for_data_before_loaded",
    )) as any;
    expect(shouldWaitForDataBeforeLoaded.default(false)).toBe(true);
  });

  it("should return true if we are not on Safari browser but in directfile mode", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isSafariMobile: false,
      };
    });
    const shouldWaitForDataBeforeLoaded = (await vi.importActual(
      "../should_wait_for_data_before_loaded",
    )) as any;
    expect(shouldWaitForDataBeforeLoaded.default(true)).toBe(true);
  });

  it("should return true if we are on the Safari browser but not in directfile mode", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isSafariMobile: true,
      };
    });
    const shouldWaitForDataBeforeLoaded = (await vi.importActual(
      "../should_wait_for_data_before_loaded",
    )) as any;
    expect(shouldWaitForDataBeforeLoaded.default(false)).toBe(true);
  });

  // eslint-disable-next-line max-len
  it("should return false if we are on the Safari browser and in directfile mode", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isSafariMobile: true,
      };
    });
    const shouldWaitForDataBeforeLoaded = (await vi.importActual(
      "../should_wait_for_data_before_loaded",
    )) as any;
    expect(shouldWaitForDataBeforeLoaded.default(true)).toBe(false);
  });

  beforeEach(() => {
    vi.resetModules();
  });
});
