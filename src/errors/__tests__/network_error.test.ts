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
