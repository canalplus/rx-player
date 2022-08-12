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

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

describe("Compat - canRelyOnVideoVisibilityAndSize", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("should return true on any browser but Firefox", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isFirefox: false };
    });
    const canRelyOnVideoVisibilityAndSize =
      jest.requireActual("../can_rely_on_video_visibility_and_size.ts");
    expect(canRelyOnVideoVisibilityAndSize.default()).toBe(true);
  });

  it("should return true on Firefox but the version is unknown", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isFirefox: true };
    });
    jest.mock("../browser_version", () => {
      return { __esModule: true as const,
               getFirefoxVersion: () => -1 };
    });
    const canRelyOnVideoVisibilityAndSize =
      jest.requireActual("../can_rely_on_video_visibility_and_size.ts");
    expect(canRelyOnVideoVisibilityAndSize.default()).toBe(true);
  });

  it("should return true on Firefox < 67>", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isFirefox: true };
    });
    jest.mock("../browser_version", () => {
      return { __esModule: true as const,
               getFirefoxVersion: () => 60 };
    });
    const canRelyOnVideoVisibilityAndSize =
      jest.requireActual("../can_rely_on_video_visibility_and_size.ts");
    expect(canRelyOnVideoVisibilityAndSize.default()).toBe(true);
  });

  it("should return false on Firefox >= 67", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isFirefox: true };
    });
    jest.mock("../browser_version", () => {
      return { __esModule: true as const,
               getFirefoxVersion: () => 83 };
    });
    const canRelyOnVideoVisibilityAndSize =
      jest.requireActual("../can_rely_on_video_visibility_and_size.ts");
    expect(canRelyOnVideoVisibilityAndSize.default()).toBe(false);
  });
});
