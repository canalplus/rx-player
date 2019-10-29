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

const originalWebKitMediaKeys = (window as any).WebKitMediaKeys;

/* tslint:disable no-unsafe-any */
describe("compat - shouldUseWebKitMediaKeys", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    (window as any).WebKitMediaKeys = originalWebKitMediaKeys;
  });

  it("should return false if we are not on Safari", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true,
               isSafari: false };
    });
    const shouldUseWebKitMediaKeys = require("../should_use_webkit_media_keys");
    expect(shouldUseWebKitMediaKeys.default()).toBe(false);
  });

  /* tslint:disable max-line-length */
  it("should return false if we are on Safari but WekitMediaKeys is not available", () => {
  /* tslint:enable max-line-length */

    (window as any).WebKitMediaKeys = undefined;
    jest.mock("../browser_detection", () => {
      return { __esModule: true,
               isSafari: true };
    });
    const shouldUseWebKitMediaKeys = require("../should_use_webkit_media_keys");
    expect(shouldUseWebKitMediaKeys.default()).toBe(false);
  });

  /* tslint:disable max-line-length */
  it("should return true if we are on Safari and a WebKitMediaKeys implementation is available", () => {
  /* tslint:enable max-line-length */

    (window as any).WebKitMediaKeys = {};
    jest.mock("../browser_detection", () => {
      return { __esModule: true,
               isSafari: true };
    });
    const shouldUseWebKitMediaKeys = require("../should_use_webkit_media_keys");
    expect(shouldUseWebKitMediaKeys.default()).toBe(true);
  });
});
/* tslint:enable no-unsafe-any */
