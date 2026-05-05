import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import parseWebVTT from "../parse_webvtt_plain_text.ts";

const mocks = vi.hoisted(() => {
  return {
    getStyleBlocks: vi.fn(),
    getCueBlocks: vi.fn(),
    parseStyleBlock: vi.fn(),
    parseCueBlock: vi.fn(),
    toHtml: vi.fn(),
    getFirstLineAfterHeader: vi.fn(),
  };
});
vi.mock("../../get_style_blocks", () => ({
  default: mocks.getStyleBlocks,
}));
vi.mock("../../get_cue_blocks", () => ({
  default: mocks.getCueBlocks,
}));
vi.mock("../../parse_cue_block", () => ({
  default: mocks.parseCueBlock,
}));
vi.mock("../../parse_style_block", () => ({
  default: mocks.parseStyleBlock,
}));
vi.mock("../to_html", () => ({
  default: mocks.toHtml,
}));
vi.mock("../../utils", () => ({
  getFirstLineAfterHeader: mocks.getFirstLineAfterHeader,
}));

describe("parsers - webvtt - parseWebVTT", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    mocks.getStyleBlocks.mockReset();
    mocks.getCueBlocks.mockReset();
    mocks.parseStyleBlock.mockReset();
    mocks.parseCueBlock.mockReset();
    mocks.toHtml.mockReset();
    mocks.getFirstLineAfterHeader.mockReset();
  });

  it("should throw if text is empty", () => {
    expect(() => parseWebVTT("", {}, 0)).toThrowError(
      "Can't parse WebVTT: Invalid File.",
    );
  });

  it("should throw if file seems to be invalid", () => {
    expect(() => parseWebVTT("WEBWTT\n", {}, 0)).toThrowError(
      "Can't parse WebVTT: Invalid File.",
    );
  });

  it("should return cues if inner contains right cues", () => {
    mocks.getStyleBlocks.mockImplementation(() => [
      ["STYLE", ""],
      ["STYLE", ""],
    ]);

    mocks.getCueBlocks.mockImplementation(() => [
      ["CUE", ""],
      ["CUE", ""],
    ]);

    mocks.parseCueBlock.mockImplementation(() => ({
      start: 0,
      end: 100,
      payload: "<b>Test</b>Bonjour",
      header: "b",
      settings: {},
    }));

    mocks.parseStyleBlock.mockImplementation(() => ({
      b: {
        styleContent: "color:blue;",
      },
    }));

    mocks.toHtml.mockImplementation(() => ({
      start: 0,
      end: 100,
      element: document.createElement("div"),
    }));

    mocks.getFirstLineAfterHeader.mockImplementation(() => 1);

    expect(parseWebVTT("WEBVTT\n", {}, 0)).toEqual([
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
    expect(mocks.getFirstLineAfterHeader).toHaveBeenCalledTimes(1);
    expect(mocks.getStyleBlocks).toHaveBeenCalledTimes(1);
    expect(mocks.getCueBlocks).toHaveBeenCalledTimes(1);
    expect(mocks.parseStyleBlock).toHaveBeenCalledTimes(1);
    expect(mocks.parseCueBlock).toHaveBeenCalledTimes(2);
    expect(mocks.toHtml).toHaveBeenCalledTimes(2);
  });

  it("should return empty array if cue blocks can't be parsed", () => {
    mocks.getStyleBlocks.mockImplementation(() => [
      ["STYLE", ""],
      ["STYLE", ""],
    ]);

    mocks.getCueBlocks.mockImplementation(() => [
      ["CUE", ""],
      ["CUE", ""],
    ]);

    mocks.parseCueBlock.mockImplementation(() => null);

    mocks.parseStyleBlock.mockImplementation(() => ({
      b: {
        styleContent: "color:blue;",
      },
    }));

    mocks.toHtml.mockImplementation(() => ({
      start: 0,
      end: 100,
      element: document.createElement("div"),
    }));

    mocks.getFirstLineAfterHeader.mockImplementation(() => 1);

    expect(parseWebVTT("WEBVTT\n", {}, 0)).toEqual([]);
    expect(mocks.getFirstLineAfterHeader).toHaveBeenCalledTimes(1);
    expect(mocks.getStyleBlocks).toHaveBeenCalledTimes(1);
    expect(mocks.getCueBlocks).toHaveBeenCalledTimes(1);
    expect(mocks.parseStyleBlock).toHaveBeenCalledTimes(1);
    expect(mocks.parseCueBlock).toHaveBeenCalledTimes(2);
    expect(mocks.toHtml).not.toHaveBeenCalled();
  });
});
