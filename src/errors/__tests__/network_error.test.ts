import { describe, it, expect } from "vitest";
import { RequestError } from "../../utils/request";
import NetworkError from "../network_error";

describe("errors - NetworkError", () => {
  it("should be able to use a RequestError", () => {
    const requestError = new RequestError("foo", 0, "TIMEOUT");
    const networkError = new NetworkError("PIPELINE_LOAD_ERROR", requestError);
    expect(networkError).toBeInstanceOf(Error);
    expect(networkError.name).toBe("NetworkError");
    expect(networkError.type).toBe("NETWORK_ERROR");
    expect(networkError.status).toBe(0);
    expect(networkError.errorType).toBe(requestError.type);
    expect(networkError.code).toBe("PIPELINE_LOAD_ERROR");
    expect(networkError.fatal).toBe(false);
    expect(networkError.message).toBe("PIPELINE_LOAD_ERROR: The request timed out");
  });

  it("should filter in a valid error code", () => {
    const requestError = new RequestError("foo", 403, "ERROR_HTTP_CODE");
    const networkError = new NetworkError("PIPELINE_LOAD_ERROR", requestError);
    networkError.fatal = true;
    expect(networkError).toBeInstanceOf(Error);
    expect(networkError.name).toBe("NetworkError");
    expect(networkError.type).toBe("NETWORK_ERROR");
    expect(networkError.status).toBe(403);
    expect(networkError.errorType).toBe(requestError.type);
    expect(networkError.code).toBe("PIPELINE_LOAD_ERROR");
    expect(networkError.fatal).toBe(true);
    expect(networkError.message).toBe(
      "PIPELINE_LOAD_ERROR: An HTTP status code " +
        "indicating failure was received: 403",
    );
  });

  it("should return false in isHttpError if not an HTTP error", () => {
    const requestError = new RequestError("foo", 500, "TIMEOUT");
    const networkError = new NetworkError("PIPELINE_LOAD_ERROR", requestError);
    expect(networkError.isHttpError(0)).toBe(false);
  });

  it("should return false in isHttpError if it is an HTTP error with a different code", () => {
    const requestError = new RequestError("foo", 500, "ERROR_HTTP_CODE");
    const networkError = new NetworkError("PIPELINE_LOAD_ERROR", requestError);
    expect(networkError.isHttpError(1)).toBe(false);
  });

  it("should return true in isHttpError if it is an HTTP error with the same code", () => {
    const requestError = new RequestError("foo", 418, "ERROR_HTTP_CODE");
    const networkError = new NetworkError("PIPELINE_LOAD_ERROR", requestError);
    expect(networkError.isHttpError(418)).toBe(true);
  });
});
