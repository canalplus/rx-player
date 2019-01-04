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
import RequestError from "../request_error";

describe("errors - RequestError", () => {
  it("should format a RequestError when called", () => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://www.example.com");
    const requestError = new RequestError(xhr, "foo", "bar");
    expect(requestError).instanceof(Error);
    expect(requestError.name).to.equal("RequestError");
    expect(requestError.url).to.equal("foo");
    expect(requestError.xhr).to.equal(xhr);
    expect(requestError.status).to.equal(xhr.status);
    expect(requestError.type).to.equal("bar");
    expect(requestError.message).to.equal("bar");
    xhr.abort();
  });
});
