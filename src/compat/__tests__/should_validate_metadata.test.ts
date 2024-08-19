import { describe, beforeEach, it, expect, vi } from "vitest";
import type IShouldValidateMetadata from "../should_validate_metadata";

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
    const shouldValidateMetadata = (await vi.importActual("../should_validate_metadata"))
      .default as typeof IShouldValidateMetadata;
    expect(shouldValidateMetadata()).toBe(false);
  });

  it("should return true if we are on the Samsung browser", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isSamsungBrowser: true,
      };
    });
    const shouldValidateMetadata = (await vi.importActual("../should_validate_metadata"))
      .default as typeof IShouldValidateMetadata;
    expect(shouldValidateMetadata()).toBe(true);
  });
});
