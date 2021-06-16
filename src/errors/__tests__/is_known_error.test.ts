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

import AssertionError from "../assertion_error";
import EncryptedMediaError from "../encrypted_media_error";
import isKnownError from "../is_known_error";
import MediaError from "../media_error";
import NetworkError from "../network_error";
import OtherError from "../other_error";
import RequestError from "../request_error";

describe("Errors - isKnownError", () => {
  it("should return false for a regular error", () => {
    expect(isKnownError(new Error("nope")))
      .toBe(false);
  });

  it("should return false for a RequestError", () => {
    const requestError = new RequestError("foo", 23, "TIMEOUT");
    expect(isKnownError(requestError)).toBe(false);
  });

  it("should return false for an AssertionError", () => {
    const assertionError = new AssertionError("foo");
    expect(isKnownError(assertionError)).toBe(false);
  });

  it("should return true for an OtherError", () => {
    const otherError = new OtherError("NONE", "tata");
    expect(isKnownError(otherError)).toBe(true);
  });

  it("should return true for a NetworkError", () => {
    const requestError = new RequestError("foo", 44, "ERROR_HTTP_CODE");
    const networkError = new NetworkError("PIPELINE_LOAD_ERROR", requestError);
    expect(isKnownError(networkError)).toBe(true);
  });

  it("should return true for a MediaError", () => {
    const mediaError = new MediaError("MEDIA_ERR_DECODE", "toto");
    expect(isKnownError(mediaError)).toBe(true);
  });

  it("should return true for an EncryptedMediaError", () => {
    const encryptedMediaError = new EncryptedMediaError("KEY_UPDATE_ERROR", "toto");
    expect(isKnownError(encryptedMediaError)).toBe(true);
  });
});
