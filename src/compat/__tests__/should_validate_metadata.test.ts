import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("compat - shouldValidateMetadata", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return false if we are not on the Samsung browser", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isSamsungBrowser: false,
      };
    });
    const shouldValidateMetadata = (await vi.importActual(
      "../should_validate_metadata",
    )) as any;
    expect(shouldValidateMetadata.default()).toBe(false);
  });

  it("should return true if we are on the Samsung browser", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isSamsungBrowser: true,
      };
    });
    const shouldValidateMetadata = (await vi.importActual(
      "../should_validate_metadata",
    )) as any;
    expect(shouldValidateMetadata.default()).toBe(true);
  });
  beforeEach(() => {
    vi.resetModules();
  });
});
