import { describe, it, expect } from "vitest";
import EncryptedMediaError from "../encrypted_media_error";

describe("errors - EncryptedMediaError", () => {
  it("should format an EncryptedMediaError", () => {
    const reason = "test";
    const encryptedMediaError = new EncryptedMediaError("KEY_LOAD_TIMEOUT", reason);
    expect(encryptedMediaError).toBeInstanceOf(Error);
    expect(encryptedMediaError.name).toBe("EncryptedMediaError");
    expect(encryptedMediaError.type).toBe("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.code).toBe("KEY_LOAD_TIMEOUT");
    expect(encryptedMediaError.fatal).toBe(false);
    expect(encryptedMediaError.message).toBe("KEY_LOAD_TIMEOUT: test");
  });

  it("should be able to set it as fatal", () => {
    const reason = "test";
    const encryptedMediaError = new EncryptedMediaError(
      "INCOMPATIBLE_KEYSYSTEMS",
      reason,
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
