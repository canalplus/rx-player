import { describe, beforeEach, it, expect, vi } from "vitest";
import parseStyleBlock from "../parse_style_block.ts";

const mocks = vi.hoisted(() => {
  return {
    createDefaultStyleElements: vi.fn(),
  };
});
vi.mock("../create_default_style_elements", () => ({
  default: mocks.createDefaultStyleElements,
}));

describe("parsers - webvtt - parseStyleBlock", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createDefaultStyleElements.mockReset();
  });

  it("should correctly handle empty style blocks", () => {
    const webvttStyle = [["STYLE"], []];
    mocks.createDefaultStyleElements.mockImplementation(() => ({}));

    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {},
      global: "",
    });
  });

  it("should parse global style", () => {
    const webvttStyle = [
      [
        "STYLE",
        "::cue {",
        "background-image: linear-gradient(to bottom, dimgray, lightgray);",
        "color: papayawhip;",
        "}",
      ],
    ];
    mocks.createDefaultStyleElements.mockImplementation(() => ({}));

    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {},
      global:
        "background-image: linear-gradient(to bottom, dimgray, lightgray);" +
        "color: papayawhip;",
    });
  });

  it("should parse class style", () => {
    const webvttStyle = [["STYLE", "::cue(b) {", "  color: peachpuff;", "}"]];
    mocks.createDefaultStyleElements.mockImplementation(() => ({}));

    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  color: peachpuff;",
      },
      global: "",
    });
  });

  it("should parse both global and class style", () => {
    const webvttStyle = [
      [
        "STYLE",
        "::cue {",
        "background-image: linear-gradient(to bottom, dimgray, lightgray);",
        "color: papayawhip;",
        "}",
      ],
      ["STYLE", "::cue(b) {", "  color: peachpuff;", "}"],
    ];
    mocks.createDefaultStyleElements.mockImplementation(() => ({}));

    expect(parseStyleBlock(webvttStyle)).toEqual({
      global:
        "background-image: linear-gradient(to bottom, dimgray, lightgray);" +
        "color: papayawhip;",
      classes: {
        b: "  color: peachpuff;",
      },
    });
  });

  it("should not parse unformed styles", () => {
    const webvttStyle = [
      ["BAD STYLE"],
      ["STYLE", "::cue(b) {", "  color: peachpuff;", "}"],
    ];
    mocks.createDefaultStyleElements.mockImplementation(() => ({}));

    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  color: peachpuff;",
      },
      global: "",
    });
  });

  it("should not override styles if class if declared several times", () => {
    const webvttStyle = [
      ["STYLE", "::cue(b) {", "  color: peachpuff;", "}"],
      ["STYLE", "::cue(b) {", "  background-color: dark;", "}"],
    ];
    mocks.createDefaultStyleElements.mockImplementation(() => ({}));

    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  color: peachpuff;  background-color: dark;",
      },
      global: "",
    });
  });

  it("should take into account all cues declared in one style block", () => {
    const webvttStyle = [
      [
        "STYLE",
        "::cue {",
        "  color: peachpuff;",
        "}",
        "::cue(b) {",
        "  background-color: dark;",
        "}",
      ],
    ];
    mocks.createDefaultStyleElements.mockImplementation(() => ({}));

    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  background-color: dark;",
      },
      global: "  color: peachpuff;",
    });
  });

  it("should consider a cue declared in multi-cue and mono-cue style blocks", () => {
    const webvttStyle = [
      [
        "STYLE",
        "::cue {",
        "  color: peachpuff;",
        "}",
        "::cue(b) {",
        "  background-color: dark;",
        "}",
      ],
      ["STYLE", "::cue(b) {", "  color: salmon;", "}"],
    ];
    mocks.createDefaultStyleElements.mockImplementation(() => ({}));

    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  background-color: dark;  color: salmon;",
      },
      global: "  color: peachpuff;",
    });
  });
  it("should consider a cue declared in multi-cue and mono-cue style blocks", () => {
    const webvttStyle = [
      [
        "STYLE",
        "::cue {",
        "  color: peachpuff;",
        "}",
        "::cue(b) {",
        "  background-color: dark;",
        "}",
      ],
      ["STYLE", "::cue(b) {", "  color: salmon;", "}"],
    ];
    mocks.createDefaultStyleElements.mockImplementation(() => ({}));

    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  background-color: dark;  color: salmon;",
      },
      global: "  color: peachpuff;",
    });
  });

  it("should consider multiple class declaration for one stylesheet", () => {
    const webvttStyle = [
      ["STYLE", "::cue(c),", "::cue(d),", "::cue(b) {", "  background-color: dark;", "}"],
      ["STYLE", "::cue(c) {", "  color: salmon;", "}"],
    ];
    mocks.createDefaultStyleElements.mockImplementation(() => ({}));

    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  background-color: dark;",
        d: "  background-color: dark;",
        c: "  background-color: dark;  color: salmon;",
      },
      global: "",
    });
  });

  it("should return empty style if no style block", () => {
    const webvttStyle: string[][] = [];
    mocks.createDefaultStyleElements.mockImplementation(() => ({}));

    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {},
      global: "",
    });
  });
});
