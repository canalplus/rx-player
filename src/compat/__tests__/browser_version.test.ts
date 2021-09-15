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

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-var-requires */

describe("Compat - Browser version", () => {
  const origUserAgent = navigator.userAgent;
  Object.defineProperty(navigator,
                        "userAgent",
                        ((value: string) => ({
                          get() { return value; },
                          /* eslint-disable no-param-reassign */
                          set(v: string) { value = v; },
                          /* eslint-enable no-param-reassign */
                        }))(navigator.userAgent));

  const nav = navigator as {
    userAgent: string;
  };

  afterEach(() => {
    nav.userAgent = origUserAgent;
    jest.resetModules();
  });

  it("Should return correct Firefox version (60)", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isFirefox: true };
    });
    const { getFirefoxVersion } = require("../browser_version");
    nav.userAgent = "Firefox/60.0";
    const version = getFirefoxVersion();
    expect(version).toBe(60);
  });

  it("Should return correct Firefox version (80)", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isFirefox: true };
    });
    const { getFirefoxVersion } = require("../browser_version");
    nav.userAgent = "Firefox/80.0";
    const version = getFirefoxVersion();
    expect(version).toBe(80);
  });

  it("Should return null when not on Firefox", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isFirefox: false };
    });
    const { getFirefoxVersion } = require("../browser_version");
    const version = getFirefoxVersion();
    expect(version).toBe(null);
  });

  it("Should return null when obscure Firefox user agent", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isFirefox: true };
    });
    const { getFirefoxVersion } = require("../browser_version");
    nav.userAgent = "FireFennec/80.0";
    const version = getFirefoxVersion();
    expect(version).toBe(-1);
  });
});
