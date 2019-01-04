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
import NetworkError from "../network_error";
import RequestError from "../request_error";

describe("errors - NetworkError", () => {
  it("should format an OtherError when called with minimal arguments", () => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://www.example.com");
    const requestError = new RequestError(xhr, "foo", "bar");
    const networkError = new NetworkError("foo", requestError);
    expect(networkError).instanceof(Error);
    expect(networkError.name).to.equal("NetworkError");
    expect(networkError.type).to.equal("NETWORK_ERROR");
    expect(networkError.xhr).to.equal(requestError.xhr);
    expect(networkError.status).to.equal(requestError.status);
    expect(networkError.errorType).to.equal(requestError.type);
    expect(networkError.reason).to.equal(requestError);
    expect(networkError.code).to.equal("");
    expect(networkError.fatal).to.equal(false);
    expect(networkError.message).to.equal("NetworkError () bar");
  });

  it("should be able to set it as fatal", () => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://www.example.com");
    const requestError = new RequestError(xhr, "foo", "bar");
    const networkError = new NetworkError("foo", requestError, true);
    expect(networkError).instanceof(Error);
    expect(networkError.name).to.equal("NetworkError");
    expect(networkError.type).to.equal("NETWORK_ERROR");
    expect(networkError.xhr).to.equal(requestError.xhr);
    expect(networkError.status).to.equal(requestError.status);
    expect(networkError.errorType).to.equal(requestError.type);
    expect(networkError.reason).to.equal(requestError);
    expect(networkError.code).to.equal("");
    expect(networkError.fatal).to.equal(true);
    expect(networkError.message).to.equal("NetworkError () bar");
  });

  it("should filter in a valid error code", () => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://www.example.com");
    const requestError = new RequestError(xhr, "foo", "bar");
    const networkError = new NetworkError("MEDIA_ERR_NETWORK", requestError, true);
    expect(networkError).instanceof(Error);
    expect(networkError.name).to.equal("NetworkError");
    expect(networkError.type).to.equal("NETWORK_ERROR");
    expect(networkError.xhr).to.equal(requestError.xhr);
    expect(networkError.status).to.equal(requestError.status);
    expect(networkError.errorType).to.equal(requestError.type);
    expect(networkError.reason).to.equal(requestError);
    expect(networkError.code).to.equal("MEDIA_ERR_NETWORK");
    expect(networkError.fatal).to.equal(true);
    expect(networkError.message).to.equal("NetworkError (MEDIA_ERR_NETWORK) bar");
  });

  it("should return false in isHttpError if not an HTTP error", () => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://www.example.com");
    const requestError = new RequestError(xhr, "foo", "bar");
    const networkError = new NetworkError("MEDIA_ERR_NETWORK", requestError, true);
    expect(networkError.isHttpError(0)).to.equal(false);
  });

  /* tslint:disable max-line-length */
  it("should return false in isHttpError if it is an HTTP error with a different code", () => {
  /* tslint:enable max-line-length */
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://www.example.com");
    const requestError = new RequestError(xhr, "foo", "ERROR_HTTP_CODE");
    const networkError = new NetworkError("MEDIA_ERR_NETWORK", requestError, true);
    expect(networkError.isHttpError(1)).to.equal(false);
  });

  /* tslint:disable max-line-length */
  it("should return true in isHttpError if it is an HTTP error with the same code", () => {
  /* tslint:enable max-line-length */
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://www.example.com");
    const requestError = new RequestError(xhr, "foo", "ERROR_HTTP_CODE");
    const networkError = new NetworkError("MEDIA_ERR_NETWORK", requestError, true);
    expect(networkError.isHttpError(0)).to.equal(true);
  });
});
