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

describe("Compat - isCodecSupported", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return false if MediaSource is not supported in the current device", () => {
    jest.mock("../browser_compatibility_types", () => {
      return {
        __esModule: true,
        MediaSource_: undefined,
      };
    });
    const isCodecSupported = require("../is_codec_supported").default;
    expect(isCodecSupported("foo")).toEqual(false);
    expect(isCodecSupported("")).toEqual(false);
  });

  /* tslint:disable max-line-length */
  it("should return true in any case if the MediaSource does not have the right function", () => {
  /* tslint:enable max-line-length */
    jest.mock("../browser_compatibility_types", () => {
      return {
        __esModule: true,
        MediaSource_: { isTypeSupported: undefined },
      };
    });
    const isCodecSupported = require("../is_codec_supported").default;
    expect(isCodecSupported("foo")).toEqual(true);
    expect(isCodecSupported("")).toEqual(true);
  });

  it("should return true if MediaSource.isTypeSupported returns true", () => {
    jest.mock("../browser_compatibility_types", () => {
      return {
        __esModule: true,
        MediaSource_: { isTypeSupported(_codec : string) { return true; } },
      };
    });
    const isCodecSupported = require("../is_codec_supported").default;
    expect(isCodecSupported("foo")).toEqual(true);
    expect(isCodecSupported("")).toEqual(true);
  });

  it("should return false if MediaSource.isTypeSupported returns false", () => {
    jest.mock("../browser_compatibility_types", () => {
      return {
        __esModule: true,
        MediaSource_: { isTypeSupported(_codec : string) { return false; } },
      };
    });
    const isCodecSupported = require("../is_codec_supported").default;
    expect(isCodecSupported("foo")).toEqual(false);
    expect(isCodecSupported("")).toEqual(false);
  });
});
