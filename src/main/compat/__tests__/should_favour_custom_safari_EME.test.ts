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

describe("compat - shouldFavourSafariMediaKeys", () => {
  const win = window as unknown as Window & {
    WebKitMediaKeys? : unknown;
    HTMLMediaElement : typeof HTMLMediaElement;
  };

  const originalWebKitMediaKeys = win.WebKitMediaKeys;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    win.WebKitMediaKeys = originalWebKitMediaKeys;
  });

  it("should return false if we are not on Safari", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isSafariDesktop: false,
               isSafariMobile: false };
    });
    const shouldFavourCustomSafariEME =
      jest.requireActual("../should_favour_custom_safari_EME");
    expect(shouldFavourCustomSafariEME.default()).toBe(false);
  });

  /* eslint-disable max-len */
  it("should return false if we are on Safari Desktop but WekitMediaKeys is not available", () => {
  /* eslint-enable max-len */

    win.WebKitMediaKeys = undefined;
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isSafariDesktop: true,
               isSafariMobile: false };
    });
    const shouldFavourCustomSafariEME =
      jest.requireActual("../should_favour_custom_safari_EME");
    expect(shouldFavourCustomSafariEME.default()).toBe(false);
  });

  /* eslint-disable max-len */
  it("should return false if we are on Safari Mobile but WekitMediaKeys is not available", () => {
  /* eslint-enable max-len */

    win.WebKitMediaKeys = undefined;
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isSafariDesktop: false,
               isSafariMobile: true };
    });
    const shouldFavourCustomSafariEME =
      jest.requireActual("../should_favour_custom_safari_EME");
    expect(shouldFavourCustomSafariEME.default()).toBe(false);
  });

  /* eslint-disable max-len */
  it("should return true if we are on Safari Desktop and a WebKitMediaKeys implementation is available", () => {
  /* eslint-enable max-len */

    win.WebKitMediaKeys = {
      isTypeSupported: () => ({}),
      prototype: {
        createSession: () => ({}),
      },
    };
    const proto = win.HTMLMediaElement.prototype as unknown as {
      webkitSetMediaKeys : () => Record<string, never>;
    };
    proto.webkitSetMediaKeys = () => ({});
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isSafariDesktop: true,
               isSafariMobile: false };
    });
    const shouldFavourCustomSafariEME =
      jest.requireActual("../should_favour_custom_safari_EME");
    expect(shouldFavourCustomSafariEME.default()).toBe(true);
  });

  /* eslint-disable max-len */
  it("should return true if we are on Safari Mobile and a WebKitMediaKeys implementation is available", () => {
  /* eslint-enable max-len */

    win.WebKitMediaKeys = {
      isTypeSupported: () => ({}),
      prototype: {
        createSession: () => ({}),
      },
    };
    const proto = win.HTMLMediaElement.prototype as unknown as {
      webkitSetMediaKeys : () => Record<string, never>;
    };
    proto.webkitSetMediaKeys = () => ({});
    jest.mock("../browser_detection", () => {
      return { __esModule: true as const,
               isSafariDesktop: false,
               isSafariMobile: true };
    });
    const shouldFavourCustomSafariEME =
      jest.requireActual("../should_favour_custom_safari_EME");
    expect(shouldFavourCustomSafariEME.default()).toBe(true);
  });
});
