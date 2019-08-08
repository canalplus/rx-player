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

import NetworkError from "../network_error";
import RequestError from "../request_error";

describe("errors - NetworkError", () => {
  it("should use a RequestError", () => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://www.example.com");
    const requestError = new RequestError(xhr, "foo", 12, "TIMEOUT");
    const networkError = new NetworkError("PIPELINE_LOAD_ERROR", requestError);
    expect(networkError).toBeInstanceOf(Error);
    expect(networkError.name).toBe("NetworkError");
    expect(networkError.type).toBe("NETWORK_ERROR");
    expect(networkError.xhr).toBe(requestError.xhr);
    expect(networkError.status).toBe(12);
    expect(networkError.errorType).toBe(requestError.type);
    expect(networkError.code).toBe("PIPELINE_LOAD_ERROR");
    expect(networkError.fatal).toBe(false);
    expect(networkError.message)
      .toBe("NetworkError (PIPELINE_LOAD_ERROR) TIMEOUT");
  });

  it("should filter in a valid error code", () => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://www.example.com");
    const requestError = new RequestError(xhr, "foo", 13, "ERROR_HTTP_CODE");
    const networkError = new NetworkError("PIPELINE_LOAD_ERROR", requestError);
    networkError.fatal = true;
    expect(networkError).toBeInstanceOf(Error);
    expect(networkError.name).toBe("NetworkError");
    expect(networkError.type).toBe("NETWORK_ERROR");
    expect(networkError.xhr).toBe(requestError.xhr);
    expect(networkError.status).toBe(13);
    expect(networkError.errorType).toBe(requestError.type);
    expect(networkError.code).toBe("PIPELINE_LOAD_ERROR");
    expect(networkError.fatal).toBe(true);
    expect(networkError.message)
      .toBe("NetworkError (PIPELINE_LOAD_ERROR) ERROR_HTTP_CODE");
  });

  it("should return false in isHttpError if not an HTTP error", () => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://www.example.com");
    const requestError = new RequestError(xhr, "foo", 500, "TIMEOUT");
    const networkError = new NetworkError("PIPELINE_LOAD_ERROR", requestError);
    expect(networkError.isHttpError(0)).toBe(false);
  });

  /* tslint:disable max-line-length */
  it("should return false in isHttpError if it is an HTTP error with a different code", () => {
  /* tslint:enable max-line-length */
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://www.example.com");
    const requestError = new RequestError(xhr, "foo", 44, "ERROR_HTTP_CODE");
    const networkError = new NetworkError("PIPELINE_LOAD_ERROR", requestError);
    expect(networkError.isHttpError(1)).toBe(false);
  });

  /* tslint:disable max-line-length */
  it("should return true in isHttpError if it is an HTTP error with the same code", () => {
  /* tslint:enable max-line-length */
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://www.example.com");
    const requestError = new RequestError(xhr, "foo", 33, "ERROR_HTTP_CODE");
    const networkError = new NetworkError("PIPELINE_LOAD_ERROR", requestError);
    expect(networkError.isHttpError(33)).toBe(true);
  });
});
