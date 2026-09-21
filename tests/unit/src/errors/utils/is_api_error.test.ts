import { describe, it, expect } from "vitest";
import EncryptedMediaError from "../../../../../src/errors/public_api/encrypted_media_error.ts";
import MediaError from "../../../../../src/errors/public_api/media_error.ts";
import NetworkError from "../../../../../src/errors/public_api/network_error.ts";
import OtherError from "../../../../../src/errors/public_api/other_error.ts";
import isApiError from "../../../../../src/errors/utils/is_api_error.ts";
import { RequestError } from "../../../../../src/utils/request/index.ts";

describe("Errors - isApiError", () => {
  it("should return false for a regular error", () => {
    expect(isApiError(new Error("nope"))).toBe(false);
  });

  it("should return false for a RequestError", () => {
    const requestError = new RequestError("foo", 23, "TIMEOUT");
    expect(isApiError(requestError)).toBe(false);
  });

  it("should return true for an OtherError", () => {
    const otherError = new OtherError("NONE", "tata");
    expect(isApiError(otherError)).toBe(true);
  });

  it("should return true for a NetworkError", () => {
    const requestError = new RequestError("foo", 44, "ERROR_HTTP_CODE");
    const networkError = new NetworkError("PIPELINE_LOAD_ERROR", requestError);
    expect(isApiError(networkError)).toBe(true);
  });

  it("should return true for a MediaError", () => {
    const mediaError = new MediaError("MEDIA_ERR_DECODE", "toto");
    expect(isApiError(mediaError)).toBe(true);
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
    expect(isApiError(encryptedMediaError)).toBe(true);
  });
});
