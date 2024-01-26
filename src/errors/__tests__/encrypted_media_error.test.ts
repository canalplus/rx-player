/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
