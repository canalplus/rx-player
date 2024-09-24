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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("compat - shouldWaitForDataBeforeLoaded", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return true if we are not on Safari browser nor in directfile mode", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isSafariMobile: false,
      };
    });
    const shouldWaitForDataBeforeLoaded = jest.requireActual(
      "../should_wait_for_data_before_loaded",
    );
    expect(shouldWaitForDataBeforeLoaded.default(false)).toBe(true);
  });

  it("should return true if we are not on Safari browser but in directfile mode", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isSafariMobile: false,
      };
    });
    const shouldWaitForDataBeforeLoaded = jest.requireActual(
      "../should_wait_for_data_before_loaded",
    );
    expect(shouldWaitForDataBeforeLoaded.default(true)).toBe(true);
  });

  /* eslint-disable max-len */
  it("should return true if we are on the Safari browser but not in directfile mode", () => {
    /* eslint-enable max-len */
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isSafariMobile: true,
      };
    });
    const shouldWaitForDataBeforeLoaded = jest.requireActual(
      "../should_wait_for_data_before_loaded",
    );
    expect(shouldWaitForDataBeforeLoaded.default(false)).toBe(true);
  });

  // eslint-disable-next-line max-len
  it("should return false if we are on the Safari browser and in directfile mode", () => {
    jest.mock("../browser_detection", () => {
      return {
        __esModule: true as const,
        isSafariMobile: true,
      };
    });
    const shouldWaitForDataBeforeLoaded = jest.requireActual(
      "../should_wait_for_data_before_loaded",
    );
    expect(shouldWaitForDataBeforeLoaded.default(true)).toBe(false);
  });

  beforeEach(() => {
    jest.resetModules();
  });
});
