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

describe("compat - hasEMEAPIs", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  /* tslint:disable max-line-length */
  it("should return true if we could define a requestMediaKeySystemAccess function", () => {
  /* tslint:enable max-line-length */

    jest.mock("../eme", () => {
      return {
        __esModule: true,
        requestMediaKeySystemAccess: () => null,
      };
    });
    const hasEMEAPIs = require("../has_eme_apis");
    expect(hasEMEAPIs.default()).toBe(true);
  });

  /* tslint:disable max-line-length */
  it("should return false if we could not define a requestMediaKeySystemAccess function", () => {
  /* tslint:enable max-line-length */

    jest.mock("../eme", () => {
      return {
        __esModule: true,
        requestMediaKeySystemAccess: null,
      };
    });
    const hasEMEAPIs = require("../has_eme_apis");
    expect(hasEMEAPIs.default()).toBe(false);
  });
});
