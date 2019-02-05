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

import OtherError from "../other_error";

describe("errors - OtherError", () => {
  it("should format an OtherError when called with minimal arguments", () => {
    const otherError = new OtherError("foo", null);
    expect(otherError).toBeInstanceOf(Error);
    expect(otherError.name).toBe("OtherError");
    expect(otherError.type).toBe("OTHER_ERROR");
    expect(otherError.reason).toBe(null);
    expect(otherError.code).toBe("");
    expect(otherError.fatal).toBe(false);
    expect(otherError.message).toBe("OtherError ()");
  });

  it("should be able to give a reason", () => {
    const reason = "test";
    const otherError = new OtherError("foo", reason);
    expect(otherError).toBeInstanceOf(Error);
    expect(otherError.name).toBe("OtherError");
    expect(otherError.type).toBe("OTHER_ERROR");
    expect(otherError.reason).toBe(reason);
    expect(otherError.code).toBe("");
    expect(otherError.fatal).toBe(false);
    expect(otherError.message).toBe("OtherError () test");
  });

  it("should be able to set it as fatal", () => {
    const reason = "test";
    const otherError = new OtherError("foo", reason, true);
    expect(otherError).toBeInstanceOf(Error);
    expect(otherError.name).toBe("OtherError");
    expect(otherError.type).toBe("OTHER_ERROR");
    expect(otherError.reason).toBe(reason);
    expect(otherError.code).toBe("");
    expect(otherError.fatal).toBe(true);
    expect(otherError.message).toBe("OtherError () test");
  });

  it("should filter in a valid error code", () => {
    const otherError = new OtherError("MEDIA_ERR_NETWORK", null, true);
    expect(otherError).toBeInstanceOf(Error);
    expect(otherError.name).toBe("OtherError");
    expect(otherError.type).toBe("OTHER_ERROR");
    expect(otherError.reason).toBe(null);
    expect(otherError.code).toBe("MEDIA_ERR_NETWORK");
    expect(otherError.fatal).toBe(true);
    expect(otherError.message).toBe("OtherError (MEDIA_ERR_NETWORK)");
  });

  /* tslint:disable max-line-length */
  it("should set a complete error message if both a valid code and a reason is given", () => {
  /* tslint:enable max-line-length */
    const reason = "test";
    const otherError = new OtherError("MEDIA_ERR_NETWORK", reason, true);
    expect(otherError).toBeInstanceOf(Error);
    expect(otherError.name).toBe("OtherError");
    expect(otherError.type).toBe("OTHER_ERROR");
    expect(otherError.reason).toBe(reason);
    expect(otherError.code).toBe("MEDIA_ERR_NETWORK");
    expect(otherError.fatal).toBe(true);
    expect(otherError.message).toBe("OtherError (MEDIA_ERR_NETWORK) test");
  });
});
