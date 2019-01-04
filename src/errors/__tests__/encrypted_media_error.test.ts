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

import { expect } from "chai";
import EncryptedMediaError from "../encrypted_media_error";

describe("errors - EncryptedMediaError", () => {
  it("should format an EncryptedMediaError when called with minimal arguments", () => {
    const encryptedMediaError = new EncryptedMediaError("foo", null);
    expect(encryptedMediaError).instanceof(Error);
    expect(encryptedMediaError.name).to.equal("EncryptedMediaError");
    expect(encryptedMediaError.type).to.equal("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.reason).to.equal(null);
    expect(encryptedMediaError.code).to.equal("");
    expect(encryptedMediaError.fatal).to.equal(false);
    expect(encryptedMediaError.message).to.equal("EncryptedMediaError ()");
  });

  it("should be able to give a reason", () => {
    const error = new Error("test");
    const encryptedMediaError = new EncryptedMediaError("foo", error);
    expect(encryptedMediaError).instanceof(Error);
    expect(encryptedMediaError.name).to.equal("EncryptedMediaError");
    expect(encryptedMediaError.type).to.equal("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.reason).to.equal(error);
    expect(encryptedMediaError.code).to.equal("");
    expect(encryptedMediaError.fatal).to.equal(false);
    expect(encryptedMediaError.message).to.equal("EncryptedMediaError () test");
  });

  it("should be able to set it as fatal", () => {
    const error = new Error("test");
    const encryptedMediaError = new EncryptedMediaError("foo", error, true);
    expect(encryptedMediaError).instanceof(Error);
    expect(encryptedMediaError.name).to.equal("EncryptedMediaError");
    expect(encryptedMediaError.type).to.equal("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.reason).to.equal(error);
    expect(encryptedMediaError.code).to.equal("");
    expect(encryptedMediaError.fatal).to.equal(true);
    expect(encryptedMediaError.message).to.equal("EncryptedMediaError () test");
  });

  it("should filter in a valid error code", () => {
    const encryptedMediaError = new EncryptedMediaError("MEDIA_ERR_NETWORK", null, true);
    expect(encryptedMediaError).instanceof(Error);
    expect(encryptedMediaError.name).to.equal("EncryptedMediaError");
    expect(encryptedMediaError.type).to.equal("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.reason).to.equal(null);
    expect(encryptedMediaError.code).to.equal("MEDIA_ERR_NETWORK");
    expect(encryptedMediaError.fatal).to.equal(true);
    expect(encryptedMediaError.message)
      .to.equal("EncryptedMediaError (MEDIA_ERR_NETWORK)");
  });

  /* tslint:disable max-line-length */
  it("should set a complete error message if both a valid code and a reason is given", () => {
  /* tslint:enable max-line-length */
    const error = new Error("test");
    const encryptedMediaError = new EncryptedMediaError("MEDIA_ERR_NETWORK", error, true);
    expect(encryptedMediaError).instanceof(Error);
    expect(encryptedMediaError.name).to.equal("EncryptedMediaError");
    expect(encryptedMediaError.type).to.equal("ENCRYPTED_MEDIA_ERROR");
    expect(encryptedMediaError.reason).to.equal(error);
    expect(encryptedMediaError.code).to.equal("MEDIA_ERR_NETWORK");
    expect(encryptedMediaError.fatal).to.equal(true);
    expect(encryptedMediaError.message)
      .to.equal("EncryptedMediaError (MEDIA_ERR_NETWORK) test");
  });
});
