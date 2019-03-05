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

describe("compat - shouldRenewMediaKeys", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return false if we are not on IE11", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true,
        isIE11: false,
      };
    });
    const shouldRenewMediaKeys = require("../should_renew_media_keys");
    expect(shouldRenewMediaKeys.default()).toBe(false);
  });

  it("should return true if we are on IE11", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true,
        isIE11: true,
      };
    });
    const shouldRenewMediaKeys = require("../should_renew_media_keys");
    expect(shouldRenewMediaKeys.default()).toBe(true);
  });
  beforeEach(() => {
    jest.resetModules();
  });
});
