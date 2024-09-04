import { describe, beforeEach, it, expect, vi } from "vitest";
import type IShouldRenewMediaKeySystemAccess from "../should_renew_media_key_system_access";

describe("compat - shouldRenewMediaKeySystemAccess", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return false if we are not on IE11", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isIE11: false,
      };
    });
    const shouldRenewMediaKeySystemAccess = (
      await vi.importActual("../should_renew_media_key_system_access")
    ).default as typeof IShouldRenewMediaKeySystemAccess;
    expect(shouldRenewMediaKeySystemAccess()).toBe(false);
  });

  it("should return true if we are on IE11", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isIE11: true,
      };
    });
    const shouldRenewMediaKeySystemAccess = (
      await vi.importActual("../should_renew_media_key_system_access")
    ).default as typeof IShouldRenewMediaKeySystemAccess;
    expect(shouldRenewMediaKeySystemAccess()).toBe(true);
  });
});
