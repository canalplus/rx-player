import { describe, it, expect } from "vitest";
import EncryptedMediaError from "../encrypted_media_error.ts";

describe("errors - EncryptedMediaError", () => {
  it("should format an EncryptedMediaError", () => {
    const reason = "test";
    const encryptedMediaError = new EncryptedMediaError(
      "MEDIA_IS_ENCRYPTED_ERROR",
      reason,
      {
        keyStatuses: undefined,
        keySystemConfiguration: undefined,
        keySystem: undefined,
      },
    );
    expect(encryptedMediaError).toBeInstanceOf(Error);
    expect(encryptedMediaError.name).toBe("EncryptedMediaError");
    expect(encryptedMediaError.type).toBe("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.code).toBe("MEDIA_IS_ENCRYPTED_ERROR");
    expect(encryptedMediaError.fatal).toBe(false);
    expect(encryptedMediaError.message).toBe("MEDIA_IS_ENCRYPTED_ERROR: test");
  });

  it("should be able to set it as fatal", () => {
    const reason = "test";
    const encryptedMediaError = new EncryptedMediaError(
      "INCOMPATIBLE_KEYSYSTEMS",
      reason,
      {
        keyStatuses: undefined,
        keySystemConfiguration: undefined,
        keySystem: undefined,
      },
    );
    encryptedMediaError.fatal = true;
    expect(encryptedMediaError).toBeInstanceOf(Error);
    expect(encryptedMediaError.name).toBe("EncryptedMediaError");
    expect(encryptedMediaError.type).toBe("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.code).toBe("INCOMPATIBLE_KEYSYSTEMS");
    expect(encryptedMediaError.fatal).toBe(true);
    expect(encryptedMediaError.message).toBe("INCOMPATIBLE_KEYSYSTEMS: test");
  });
});
