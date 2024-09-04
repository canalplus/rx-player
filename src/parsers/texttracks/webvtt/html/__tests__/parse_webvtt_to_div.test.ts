import { describe, beforeEach, it, expect, vi } from "vitest";
import type IParseWebVTT from "../parse_webvtt_to_div";

describe("parsers - webvtt - parseWebVTT", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should throw if text is empty", async () => {
    const parseWebVTT = (await vi.importActual("../parse_webvtt_to_div"))
      .default as typeof IParseWebVTT;
    expect(() => parseWebVTT("", 0)).toThrowError("Can't parse WebVTT: Invalid File.");
  });

  it("should throw if file seems to be invalid", async () => {
    const parseWebVTT = (await vi.importActual("../parse_webvtt_to_div"))
      .default as typeof IParseWebVTT;
    expect(() => parseWebVTT("WEBWTT\n", 0)).toThrowError(
      "Can't parse WebVTT: Invalid File.",
    );
  });

  it("should return cues if inner contains right cues", async () => {
    const spyGetStyleBlock = vi.fn(() => [
      ["STYLE", ""],
      ["STYLE", ""],
    ]);
    vi.doMock("../../get_style_blocks", () => ({
      default: spyGetStyleBlock,
    }));

    const spyGetCueBlock = vi.fn(() => [
      ["CUE", ""],
      ["CUE", ""],
    ]);
    vi.doMock("../../get_cue_blocks", () => ({
      default: spyGetCueBlock,
    }));

    const spyParseCueBlock = vi.fn(() => ({
      start: 0,
      end: 100,
      payload: "<b>Test</b>Bonjour",
      header: "b",
      settings: {},
    }));
    vi.doMock("../../parse_cue_block", () => ({
      default: spyParseCueBlock,
    }));

    const spyParseStyleBlock = vi.fn(() => ({
      b: {
        styleContent: "color:blue;",
      },
    }));
    vi.doMock("../parse_style_block", () => ({
      default: spyParseStyleBlock,
    }));

    const spyToHTML = vi.fn(() => ({
      start: 0,
      end: 100,
      element: document.createElement("div"),
    }));
    vi.doMock("../to_html", () => ({
      default: spyToHTML,
    }));

    const spyGetFirstLineAfterHeader = vi.fn(() => 1);
    vi.doMock("../../utils", () => ({
      getFirstLineAfterHeader: spyGetFirstLineAfterHeader,
    }));

    const parseWebVTT = (await vi.importActual("../parse_webvtt_to_div"))
      .default as typeof IParseWebVTT;
    expect(parseWebVTT("WEBVTT\n", 0)).toEqual([
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
    ]);
    expect(spyGetFirstLineAfterHeader).toHaveBeenCalledTimes(1);
    expect(spyGetStyleBlock).toHaveBeenCalledTimes(1);
    expect(spyGetCueBlock).toHaveBeenCalledTimes(1);
    expect(spyParseStyleBlock).toHaveBeenCalledTimes(1);
    expect(spyParseCueBlock).toHaveBeenCalledTimes(2);
    expect(spyToHTML).toHaveBeenCalledTimes(2);
  });

  it("should return empty array if cue blocks can't be parsed", async () => {
    const spyGetStyleBlock = vi.fn(() => [
      ["STYLE", ""],
      ["STYLE", ""],
    ]);
    vi.doMock("../../get_style_blocks", () => ({
      default: spyGetStyleBlock,
    }));

    const spyGetCueBlock = vi.fn(() => [
      ["CUE", ""],
      ["CUE", ""],
    ]);
    vi.doMock("../../get_cue_blocks", () => ({
      default: spyGetCueBlock,
    }));

    const spyParseCueBlock = vi.fn(() => null);
    vi.doMock("../../parse_cue_block", () => ({
      default: spyParseCueBlock,
    }));

    const spyParseStyleBlock = vi.fn(() => ({
      b: {
        styleContent: "color:blue;",
      },
    }));
    vi.doMock("../parse_style_block", () => ({
      default: spyParseStyleBlock,
    }));

    const spyToHTML = vi.fn(() => ({
      start: 0,
      end: 100,
      element: document.createElement("div"),
    }));
    vi.doMock("../to_html", () => ({
      default: spyToHTML,
    }));

    const spyGetFirstLineAfterHeader = vi.fn(() => 1);
    vi.doMock("../../utils", () => ({
      getFirstLineAfterHeader: spyGetFirstLineAfterHeader,
    }));

    const parseWebVTT = (await vi.importActual("../parse_webvtt_to_div"))
      .default as typeof IParseWebVTT;
    expect(parseWebVTT("WEBVTT\n", 0)).toEqual([]);
    expect(spyGetFirstLineAfterHeader).toHaveBeenCalledTimes(1);
    expect(spyGetStyleBlock).toHaveBeenCalledTimes(1);
    expect(spyGetCueBlock).toHaveBeenCalledTimes(1);
    expect(spyParseStyleBlock).toHaveBeenCalledTimes(1);
    expect(spyParseCueBlock).toHaveBeenCalledTimes(2);
    expect(spyToHTML).not.toHaveBeenCalled();
  });
});
