/**
 * Copyright 2017 CANAL+ Group
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

describe("MediaCapabilitiesProber probers - findDefaultVideoCodec", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should find default video codec", () => {
    const mockIsTypeSupported = jest.fn((codec: string) => {
      return codec === "video/mp4; codecs=\"avc1.4D401E\"" ||
        codec === "video/webm; codecs=\"vp09.00.10.08\"";
    });
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const { findDefaultVideoCodec } = require("../../probers/defaultCodecsFinder");
    expect(findDefaultVideoCodec()).toBe("video/mp4; codecs=\"avc1.4D401E\"");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should not find default video codec", () => {
    const mockIsTypeSupported = jest.fn(() => false);
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const { findDefaultVideoCodec } = require("../../probers/defaultCodecsFinder");
    expect(() => { findDefaultVideoCodec(); }).toThrowError(
      "No default video codec found.");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(2);
  });

  it("should throw because no MediaSource", () => {
    jest.mock("../../../../../compat", () => ({
      MediaSource_: null,
    }));
    const { findDefaultVideoCodec } = require("../../probers/defaultCodecsFinder");
    expect(() => { findDefaultVideoCodec(); }).toThrowError(
      "Cannot check video codec support: No API available.");
  });

  it("should throw because no isTypeSupported", () => {
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {},
    }));
    const { findDefaultVideoCodec } = require("../../probers/defaultCodecsFinder");
    expect(() => { findDefaultVideoCodec(); }).toThrowError(
      "Cannot check video codec support: No API available.");
  });
});

describe("MediaCapabilitiesProber probers - findDefaultAudioCodec", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should find default audio codec", () => {
    const mockIsTypeSupported = jest.fn((codec: string) => {
      return codec === "audio/webm; codecs=opus" ||
        codec === "audio/mp4; codecs=\"mp4a.40.2\"";
    });
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const { findDefaultAudioCodec } = require("../../probers/defaultCodecsFinder");
    expect(findDefaultAudioCodec()).toBe("audio/webm; codecs=opus");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(1);
  });

  it("should not find default audio codec", () => {
    const mockIsTypeSupported = jest.fn(() => false);
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {
        isTypeSupported: mockIsTypeSupported,
      },
    }));
    const { findDefaultAudioCodec } = require("../../probers/defaultCodecsFinder");
    expect(() => { findDefaultAudioCodec(); })
      .toThrowError("No default audio codec found.");
    expect(mockIsTypeSupported).toHaveBeenCalledTimes(2);
  });

  it("should throw because no MediaSource", () => {
    jest.mock("../../../../../compat", () => ({
      MediaSource_: null,
    }));
    const { findDefaultAudioCodec } = require("../../probers/defaultCodecsFinder");
    expect(() => { findDefaultAudioCodec(); }).toThrowError(
      "Cannot check audio codec support: No API available.");
  });

  it("should throw because no isTypeSupported", () => {
    jest.mock("../../../../../compat", () => ({
      MediaSource_: {},
    }));
    const { findDefaultAudioCodec } = require("../../probers/defaultCodecsFinder");
    expect(() => { findDefaultAudioCodec(); }).toThrow(
      "Cannot check audio codec support: No API available.");
  });
});
