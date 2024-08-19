import { describe, beforeEach, it, expect, vi } from "vitest";
import type IShouldWaitForDataBeforeLoaded from "../should_wait_for_data_before_loaded";

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
    const shouldWaitForDataBeforeLoaded = (
      await vi.importActual("../should_wait_for_data_before_loaded")
    ).default as typeof IShouldWaitForDataBeforeLoaded;
    expect(shouldWaitForDataBeforeLoaded(false)).toBe(true);
  });

  it("should return true if we are not on Safari browser but in directfile mode", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isSafariMobile: false,
      };
    });
    const shouldWaitForDataBeforeLoaded = (
      await vi.importActual("../should_wait_for_data_before_loaded")
    ).default as typeof IShouldWaitForDataBeforeLoaded;
    expect(shouldWaitForDataBeforeLoaded(true)).toBe(true);
  });

  it("should return true if we are on the Safari browser but not in directfile mode", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isSafariMobile: true,
      };
    });
    const shouldWaitForDataBeforeLoaded = (
      await vi.importActual("../should_wait_for_data_before_loaded")
    ).default as typeof IShouldWaitForDataBeforeLoaded;
    expect(shouldWaitForDataBeforeLoaded(false)).toBe(true);
  });

  // eslint-disable-next-line max-len
  it("should return false if we are on the Safari browser and in directfile mode", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isSafariMobile: true,
      };
    });
    const shouldWaitForDataBeforeLoaded = (
      await vi.importActual("../should_wait_for_data_before_loaded")
    ).default as typeof IShouldWaitForDataBeforeLoaded;
    expect(shouldWaitForDataBeforeLoaded(true)).toBe(false);
  });
});
