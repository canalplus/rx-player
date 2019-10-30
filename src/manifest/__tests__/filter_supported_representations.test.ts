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

/* tslint:disable no-unsafe-any */
describe("Manifest - filterSupportedRepresentations", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should not filter text adaptations", () => {
    const isCodecSupportedSpy = jest.fn(() => false);
    jest.mock("../../compat", () => ({ isCodecSupported: isCodecSupportedSpy }));

    const filterSupportedRepresentations = require("../filter_supported_representations")
      .default;

    const rep1 = { id: "54", bitrate: 100 };
    const rep2 = { id: "55", bitrate: 101 };
    expect(filterSupportedRepresentations("text", [rep1, rep2]))
      .toEqual([rep1, rep2]);

    expect(isCodecSupportedSpy).not.toHaveBeenCalled();
  });

  it("should not filter image adaptations", () => {
    const isCodecSupportedSpy = jest.fn(() => false);
    jest.mock("../../compat", () => ({ isCodecSupported: isCodecSupportedSpy }));

    const filterSupportedRepresentations = require("../filter_supported_representations")
      .default;

    const rep1 = { id: "54", bitrate: 100 };
    const rep2 = { id: "55", bitrate: 101 };
    expect(filterSupportedRepresentations("image", [rep1, rep2]))
      .toEqual([rep1, rep2]);

    expect(isCodecSupportedSpy).not.toHaveBeenCalled();
  });

  it("should filter video adaptations based on the MIME type and codec", () => {
    const isCodecSupportedSpy = jest.fn((arg : string) => arg.indexOf("webm") !== -1);
    jest.mock("../../compat", () => ({ isCodecSupported: isCodecSupportedSpy }));

    const filterSupportedRepresentations = require("../filter_supported_representations")
      .default;

    const rep1 = { id: "54", bitrate: 100, mimeType: "video/mp4", codecs: "avc2" };
    const rep2 = { id: "55", bitrate: 101, mimeType: "video/webm", codecs: "vp9" };
    expect(filterSupportedRepresentations("video", [rep1, rep2]))
      .toEqual([rep2]);

    expect(isCodecSupportedSpy).toHaveBeenCalledTimes(2);
    expect(isCodecSupportedSpy).toHaveBeenCalledWith("video/mp4;codecs=\"avc2\"");
    expect(isCodecSupportedSpy).toHaveBeenCalledWith("video/webm;codecs=\"vp9\"");
  });

  it("should filter audio adaptations based on the MIME type and codec", () => {
    const isCodecSupportedSpy = jest.fn((arg : string) => arg.indexOf("aac") !== -1);
    jest.mock("../../compat", () => ({ isCodecSupported: isCodecSupportedSpy }));

    const filterSupportedRepresentations = require("../filter_supported_representations")
      .default;

    const rep1 = { id: "54", bitrate: 100, mimeType: "audio/mp4", codecs: "aac" };
    const rep2 = { id: "55", bitrate: 101, mimeType: "audio/webm", codecs: "ogg" };
    expect(filterSupportedRepresentations("video", [rep1, rep2]))
      .toEqual([rep1]);

    expect(isCodecSupportedSpy).toHaveBeenCalledTimes(2);
    expect(isCodecSupportedSpy).toHaveBeenCalledWith("audio/mp4;codecs=\"aac\"");
    expect(isCodecSupportedSpy).toHaveBeenCalledWith("audio/webm;codecs=\"ogg\"");
  });

  it("should filter audio adaptations based on the MIME type and codec", () => {
    const isCodecSupportedSpy = jest.fn((arg : string) => arg.indexOf("aac") !== -1);
    jest.mock("../../compat", () => ({ isCodecSupported: isCodecSupportedSpy }));

    const filterSupportedRepresentations = require("../filter_supported_representations")
      .default;

    const rep1 = { id: "54", bitrate: 100, mimeType: "audio/mp4", codecs: "aac" };
    const rep2 = { id: "55", bitrate: 101, mimeType: "audio/webm", codecs: "ogg" };
    expect(filterSupportedRepresentations("video", [rep1, rep2]))
      .toEqual([rep1]);

    expect(isCodecSupportedSpy).toHaveBeenCalledTimes(2);
    expect(isCodecSupportedSpy).toHaveBeenCalledWith("audio/mp4;codecs=\"aac\"");
    expect(isCodecSupportedSpy).toHaveBeenCalledWith("audio/webm;codecs=\"ogg\"");
  });

  it("should set default MIME type and codecs for video adaptations", () => {
    const isCodecSupportedSpy = jest.fn(() => false);
    jest.mock("../../compat", () => ({ isCodecSupported: isCodecSupportedSpy }));

    const filterSupportedRepresentations = require("../filter_supported_representations")
      .default;

    const rep1 = { id: "54", bitrate: 100, mimeType: "video/mp4" };
    const rep2 = { id: "55", bitrate: 101, codecs: "vp9" };
    const rep3 = { id: "55", bitrate: 101 };
    filterSupportedRepresentations("video", [rep1, rep2, rep3]);

    expect(isCodecSupportedSpy).toHaveBeenCalledTimes(3);
    expect(isCodecSupportedSpy).toHaveBeenCalledWith("video/mp4;codecs=\"\"");
    expect(isCodecSupportedSpy).toHaveBeenCalledWith(";codecs=\"vp9\"");
    expect(isCodecSupportedSpy).toHaveBeenCalledWith(";codecs=\"\"");
  });

  it("should set default MIME type and codecs for audio adaptations", () => {
    const isCodecSupportedSpy = jest.fn(() => false);
    jest.mock("../../compat", () => ({ isCodecSupported: isCodecSupportedSpy }));

    const filterSupportedRepresentations = require("../filter_supported_representations")
      .default;

    const rep1 = { id: "54", bitrate: 100, mimeType: "audio/mp4" };
    const rep2 = { id: "55", bitrate: 101, codecs: "ogg" };
    const rep3 = { id: "55", bitrate: 101 };
    filterSupportedRepresentations("audio", [rep1, rep2, rep3]);

    expect(isCodecSupportedSpy).toHaveBeenCalledTimes(3);
    expect(isCodecSupportedSpy).toHaveBeenCalledWith("audio/mp4;codecs=\"\"");
    expect(isCodecSupportedSpy).toHaveBeenCalledWith(";codecs=\"ogg\"");
    expect(isCodecSupportedSpy).toHaveBeenCalledWith(";codecs=\"\"");
  });
});
/* tslint:enable no-unsafe-any */
