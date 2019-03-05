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

describe("compat - canPatchISOBMFFSegment", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return true if we are not on IE11 nor Edge", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true,
        isIEOrEdge: false,
      };
    });
    const canPatchISOBMFFSegment = require("../can_patch_isobmff");
    expect(canPatchISOBMFFSegment.default()).toBe(true);
  });

  it("should return false if we are on IE11 or Edge", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true,
        isIEOrEdge: true,
      };
    });
    const canPatchISOBMFFSegment = require("../can_patch_isobmff");
    expect(canPatchISOBMFFSegment.default()).toBe(false);
  });
});
