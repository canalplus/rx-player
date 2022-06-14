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

describe("parsers - webvtt - parseWebVTT", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should throw if text is empty", () => {
    const parseWebVTT = jest.requireActual("../parse_webvtt_to_div").default;
    expect(() => parseWebVTT("", 0))
      .toThrowError("Can't parse WebVTT: Invalid File.");
  });

  it("should throw if file seems to be invalid", () => {
    const parseWebVTT = jest.requireActual("../parse_webvtt_to_div").default;
    expect(() => parseWebVTT("WEBWTT\n", 0))
      .toThrowError("Can't parse WebVTT: Invalid File.");
  });

  it("should return cues if inner contains right cues", () => {
    const spyGetStyleBlock = jest.fn(() => [
      ["STYLE", ""],
      ["STYLE", ""],
    ]);
    jest.mock("../../get_style_blocks", () => ({
      __esModule: true as const,
      default: spyGetStyleBlock,
    }));

    const spyGetCueBlock = jest.fn(() => [
      ["CUE", ""],
      ["CUE", ""],
    ]);
    jest.mock("../../get_cue_blocks", () => ({
      __esModule: true as const,
      default: spyGetCueBlock,
    }));

    const spyParseCueBlock = jest.fn(() => ({
      start: 0,
      end: 100,
      payload: "<b>Test</b>Bonjour",
      header: "b",
      settings: {},
    }));
    jest.mock("../../parse_cue_block", () => ({
      __esModule: true as const,
      default: spyParseCueBlock,
    }));

    const spyParseStyleBlock = jest.fn(() => ({
      b: {
        styleContent: "color:blue;",
      },
    }));
    jest.mock("../parse_style_block", () => ({
      __esModule: true as const,
      default: spyParseStyleBlock,
    }));

    const spyToHTML = jest.fn(() => ({
      start: 0,
      end: 100,
      element: document.createElement("div"),
    }));
    jest.mock("../to_html", () => ({
      __esModule: true as const,
      default: spyToHTML,
    }));

    const spyGetFirstLineAfterHeader = jest.fn(() => 1);
    jest.mock("../../utils", () => ({
      __esModule: true as const,
      getFirstLineAfterHeader: spyGetFirstLineAfterHeader,
    }));

    const parseWebVTT = jest.requireActual("../parse_webvtt_to_div").default;
    expect(parseWebVTT("WEBVTT\n", 0)).toEqual(
      [
        {
          element: document.createElement("div"),
          end: 100,
          start: 0,
        },
        {
          element: document.createElement("div"),
          end: 100,
          start: 0,
        },
      ]
    );
    expect(spyGetFirstLineAfterHeader).toHaveBeenCalledTimes(1);
    expect(spyGetStyleBlock).toHaveBeenCalledTimes(1);
    expect(spyGetCueBlock).toHaveBeenCalledTimes(1);
    expect(spyParseStyleBlock).toHaveBeenCalledTimes(1);
    expect(spyParseCueBlock).toHaveBeenCalledTimes(2);
    expect(spyToHTML).toHaveBeenCalledTimes(2);
  });

  it("should return empty array if cue blocks can't be parsed", () => {
    const spyGetStyleBlock = jest.fn(() => [
      ["STYLE", ""],
      ["STYLE", ""],
    ]);
    jest.mock("../../get_style_blocks", () => ({
      __esModule: true as const,
      default: spyGetStyleBlock,
    }));

    const spyGetCueBlock = jest.fn(() => [
      ["CUE", ""],
      ["CUE", ""],
    ]);
    jest.mock("../../get_cue_blocks", () => ({
      __esModule: true as const,
      default: spyGetCueBlock,
    }));

    const spyParseCueBlock = jest.fn(() => undefined);
    jest.mock("../../parse_cue_block", () => ({
      __esModule: true as const,
      default: spyParseCueBlock,
    }));

    const spyParseStyleBlock = jest.fn(() => ({
      b: {
        styleContent: "color:blue;",
      },
    }));
    jest.mock("../parse_style_block", () => ({
      __esModule: true as const,
      default: spyParseStyleBlock,
    }));

    const spyToHTML = jest.fn(() => ({
      start: 0,
      end: 100,
      element: document.createElement("div"),
    }));
    jest.mock("../to_html", () => ({
      __esModule: true as const,
      default: spyToHTML,
    }));

    const spyGetFirstLineAfterHeader = jest.fn(() => 1);
    jest.mock("../../utils", () => ({
      __esModule: true as const,
      getFirstLineAfterHeader: spyGetFirstLineAfterHeader,
    }));

    const parseWebVTT = jest.requireActual("../parse_webvtt_to_div").default;
    expect(parseWebVTT("WEBVTT\n", 0)).toEqual([]);
    expect(spyGetFirstLineAfterHeader).toHaveBeenCalledTimes(1);
    expect(spyGetStyleBlock).toHaveBeenCalledTimes(1);
    expect(spyGetCueBlock).toHaveBeenCalledTimes(1);
    expect(spyParseStyleBlock).toHaveBeenCalledTimes(1);
    expect(spyParseCueBlock).toHaveBeenCalledTimes(2);
    expect(spyToHTML).not.toHaveBeenCalled();
  });
});
