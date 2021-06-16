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

import RequestError from "../request_error";

describe("errors - RequestError", () => {
  it("should format a RequestError when called", () => {
    const requestError = new RequestError("foo", 355, "ERROR_EVENT");
    expect(requestError).toBeInstanceOf(Error);
    expect(requestError.name).toBe("RequestError");
    expect(requestError.url).toBe("foo");
    expect(requestError.status).toBe(355);
    expect(requestError.type).toBe("ERROR_EVENT");
    expect(requestError.message).toBe("ERROR_EVENT");
  });
});
