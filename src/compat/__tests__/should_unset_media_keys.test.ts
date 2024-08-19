import { describe, beforeEach, it, expect, vi } from "vitest";
import type IShouldUnsetMediaKeys from "../should_unset_media_keys";

describe("compat - shouldUnsetMediaKeys", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return false if we are not on IE11", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isIE11: false,
      };
    });
    const shouldUnsetMediaKeys = (await vi.importActual("../should_unset_media_keys"))
      .default as typeof IShouldUnsetMediaKeys;
    expect(shouldUnsetMediaKeys()).toBe(false);
  });

  it("should return true if we are on IE11", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isIE11: true,
      };
    });
    const shouldUnsetMediaKeys = (await vi.importActual("../should_unset_media_keys"))
      .default as typeof IShouldUnsetMediaKeys;
    expect(shouldUnsetMediaKeys()).toBe(true);
  });
});
