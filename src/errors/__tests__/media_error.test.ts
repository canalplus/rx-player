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
import MediaError from "../media_error";

describe("errors - MediaError", () => {
  it("should format an MediaError when called with minimal arguments", () => {
    const mediaError = new MediaError("foo", null);
    expect(mediaError).instanceof(Error);
    expect(mediaError.name).to.equal("MediaError");
    expect(mediaError.type).to.equal("MEDIA_ERROR");
    expect(mediaError.reason).to.equal(null);
    expect(mediaError.code).to.equal("");
    expect(mediaError.fatal).to.equal(false);
    expect(mediaError.message).to.equal("MediaError ()");
  });

  it("should be able to give a reason", () => {
    const error = new Error("test");
    const mediaError = new MediaError("foo", error);
    expect(mediaError).instanceof(Error);
    expect(mediaError.name).to.equal("MediaError");
    expect(mediaError.type).to.equal("MEDIA_ERROR");
    expect(mediaError.reason).to.equal(error);
    expect(mediaError.code).to.equal("");
    expect(mediaError.fatal).to.equal(false);
    expect(mediaError.message).to.equal("MediaError () test");
  });

  it("should be able to set it as fatal", () => {
    const error = new Error("test");
    const mediaError = new MediaError("foo", error, true);
    expect(mediaError).instanceof(Error);
    expect(mediaError.name).to.equal("MediaError");
    expect(mediaError.type).to.equal("MEDIA_ERROR");
    expect(mediaError.reason).to.equal(error);
    expect(mediaError.code).to.equal("");
    expect(mediaError.fatal).to.equal(true);
    expect(mediaError.message).to.equal("MediaError () test");
  });

  it("should filter in a valid error code", () => {
    const mediaError = new MediaError("MEDIA_ERR_NETWORK", null, true);
    expect(mediaError).instanceof(Error);
    expect(mediaError.name).to.equal("MediaError");
    expect(mediaError.type).to.equal("MEDIA_ERROR");
    expect(mediaError.reason).to.equal(null);
    expect(mediaError.code).to.equal("MEDIA_ERR_NETWORK");
    expect(mediaError.fatal).to.equal(true);
    expect(mediaError.message).to.equal("MediaError (MEDIA_ERR_NETWORK)");
  });

  /* tslint:disable max-line-length */
  it("should set a complete error message if both a valid code and a reason is given", () => {
  /* tslint:enable max-line-length */
    const error = new Error("test");
    const mediaError = new MediaError("MEDIA_ERR_NETWORK", error, true);
    expect(mediaError).instanceof(Error);
    expect(mediaError.name).to.equal("MediaError");
    expect(mediaError.type).to.equal("MEDIA_ERROR");
    expect(mediaError.reason).to.equal(error);
    expect(mediaError.code).to.equal("MEDIA_ERR_NETWORK");
    expect(mediaError.fatal).to.equal(true);
    expect(mediaError.message).to.equal("MediaError (MEDIA_ERR_NETWORK) test");
  });
});

