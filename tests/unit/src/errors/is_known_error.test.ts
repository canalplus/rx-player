import { describe, it, expect } from "vitest";
import EncryptedMediaError from "../../../../src/errors/encrypted_media_error.ts";
import isKnownError from "../../../../src/errors/is_known_error.ts";
import MediaError from "../../../../src/errors/media_error.ts";
import NetworkError from "../../../../src/errors/network_error.ts";
import OtherError from "../../../../src/errors/other_error.ts";
import { RequestError } from "../../../../src/utils/request/index.ts";

describe("Errors - isKnownError", () => {
  it("should return false for a regular error", () => {
    expect(isKnownError(new Error("nope"))).toBe(false);
  });

  it("should return false for a RequestError", () => {
    const requestError = new RequestError("foo", 23, "TIMEOUT");
    expect(isKnownError(requestError)).toBe(false);
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
    const encryptedMediaError = new EncryptedMediaError(
      "INCOMPATIBLE_KEYSYSTEMS",
      "toto",
      {
        keyStatuses: undefined,
        keySystemConfiguration: undefined,
        keySystem: undefined,
      },
    );
    expect(isKnownError(encryptedMediaError)).toBe(true);
  });
});
