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
  it("should format an EncryptedMediaError when called with minimal arguments", () => {
    const encryptedMediaError = new EncryptedMediaError("foo", null);
    expect(encryptedMediaError).toBeInstanceOf(Error);
    expect(encryptedMediaError.name).toBe("EncryptedMediaError");
    expect(encryptedMediaError.type).toBe("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.reason).toBe(null);
    expect(encryptedMediaError.code).toBe("");
    expect(encryptedMediaError.fatal).toBe(false);
    expect(encryptedMediaError.message).toBe("EncryptedMediaError ()");
  });

  it("should be able to give a reason", () => {
    const error = new Error("test");
    const encryptedMediaError = new EncryptedMediaError("foo", error);
    expect(encryptedMediaError).toBeInstanceOf(Error);
    expect(encryptedMediaError.name).toBe("EncryptedMediaError");
    expect(encryptedMediaError.type).toBe("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.reason).toBe(error);
    expect(encryptedMediaError.code).toBe("");
    expect(encryptedMediaError.fatal).toBe(false);
    expect(encryptedMediaError.message).toBe("EncryptedMediaError () test");
  });

  it("should be able to set it as fatal", () => {
    const error = new Error("test");
    const encryptedMediaError = new EncryptedMediaError("foo", error, true);
    expect(encryptedMediaError).toBeInstanceOf(Error);
    expect(encryptedMediaError.name).toBe("EncryptedMediaError");
    expect(encryptedMediaError.type).toBe("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.reason).toBe(error);
    expect(encryptedMediaError.code).toBe("");
    expect(encryptedMediaError.fatal).toBe(true);
    expect(encryptedMediaError.message).toBe("EncryptedMediaError () test");
  });

  it("should filter in a valid error code", () => {
    const encryptedMediaError = new EncryptedMediaError("MEDIA_ERR_NETWORK", null, true);
    expect(encryptedMediaError).toBeInstanceOf(Error);
    expect(encryptedMediaError.name).toBe("EncryptedMediaError");
    expect(encryptedMediaError.type).toBe("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.reason).toBe(null);
    expect(encryptedMediaError.code).toBe("MEDIA_ERR_NETWORK");
    expect(encryptedMediaError.fatal).toBe(true);
    expect(encryptedMediaError.message)
      .toBe("EncryptedMediaError (MEDIA_ERR_NETWORK)");
  });

  /* tslint:disable max-line-length */
  it("should set a complete error message if both a valid code and a reason is given", () => {
  /* tslint:enable max-line-length */
    const error = new Error("test");
    const encryptedMediaError = new EncryptedMediaError("MEDIA_ERR_NETWORK", error, true);
    expect(encryptedMediaError).toBeInstanceOf(Error);
    expect(encryptedMediaError.name).toBe("EncryptedMediaError");
    expect(encryptedMediaError.type).toBe("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.reason).toBe(error);
    expect(encryptedMediaError.code).toBe("MEDIA_ERR_NETWORK");
    expect(encryptedMediaError.fatal).toBe(true);
    expect(encryptedMediaError.message)
      .toBe("EncryptedMediaError (MEDIA_ERR_NETWORK) test");
  });
});
