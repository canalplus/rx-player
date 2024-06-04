import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

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
    const shouldRenewMediaKeySystemAccess = (await vi.importActual(
      "../should_renew_media_key_system_access",
    )) as any;
    expect(shouldRenewMediaKeySystemAccess.default()).toBe(false);
  });

  it("should return true if we are on IE11", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isIE11: true,
      };
    });
    const shouldRenewMediaKeySystemAccess = (await vi.importActual(
      "../should_renew_media_key_system_access",
    )) as any;
    expect(shouldRenewMediaKeySystemAccess.default()).toBe(true);
  });
  beforeEach(() => {
    vi.resetModules();
  });
});
