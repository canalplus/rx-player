import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("parsers - webvtt - parseStyleBlock", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should correctly handle empty style blocks", async () => {
    const webvttStyle = [["STYLE"], []];

    const mockCreateDefaultStyleElements = vi.fn(() => ({}));
    vi.doMock("../create_default_style_elements", () => ({
      default: () => {
        return mockCreateDefaultStyleElements();
      },
    }));
    const parseStyleBlock = ((await vi.importActual("../parse_style_block")) as any)
      .default;
    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {},
      global: "",
    });
  });

  it("should parse global style", async () => {
    const webvttStyle = [
      [
        "STYLE",
        "::cue {",
        "background-image: linear-gradient(to bottom, dimgray, lightgray);",
        "color: papayawhip;",
        "}",
      ],
    ];

    const mockCreateDefaultStyleElements = vi.fn(() => ({}));
    vi.doMock("../create_default_style_elements", () => ({
      default: () => {
        return mockCreateDefaultStyleElements();
      },
    }));
    const parseStyleBlock = ((await vi.importActual("../parse_style_block")) as any)
      .default;
    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {},
      global:
        "background-image: linear-gradient(to bottom, dimgray, lightgray);" +
        "color: papayawhip;",
    });
  });

  it("should parse class style", async () => {
    const webvttStyle = [["STYLE", "::cue(b) {", "  color: peachpuff;", "}"]];

    const mockCreateDefaultStyleElements = vi.fn(() => ({}));
    vi.doMock("../create_default_style_elements", () => ({
      default: () => {
        return mockCreateDefaultStyleElements();
      },
    }));
    const parseStyleBlock = ((await vi.importActual("../parse_style_block")) as any)
      .default;
    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  color: peachpuff;",
      },
      global: "",
    });
  });

  it("should parse both global and class style", async () => {
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

    const mockCreateDefaultStyleElements = vi.fn(() => ({}));
    vi.doMock("../create_default_style_elements", () => ({
      default: () => {
        return mockCreateDefaultStyleElements();
      },
    }));
    const parseStyleBlock = ((await vi.importActual("../parse_style_block")) as any)
      .default;
    expect(parseStyleBlock(webvttStyle)).toEqual({
      global:
        "background-image: linear-gradient(to bottom, dimgray, lightgray);" +
        "color: papayawhip;",
      classes: {
        b: "  color: peachpuff;",
      },
    });
  });

  it("should not parse unformed styles", async () => {
    const webvttStyle = [
      ["BAD STYLE"],
      ["STYLE", "::cue(b) {", "  color: peachpuff;", "}"],
    ];

    const mockCreateDefaultStyleElements = vi.fn(() => ({}));
    vi.doMock("../create_default_style_elements", () => ({
      default: () => {
        return mockCreateDefaultStyleElements();
      },
    }));
    const parseStyleBlock = ((await vi.importActual("../parse_style_block")) as any)
      .default;
    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  color: peachpuff;",
      },
      global: "",
    });
  });

  it("should not override styles if class if declared several times", async () => {
    const webvttStyle = [
      ["STYLE", "::cue(b) {", "  color: peachpuff;", "}"],
      ["STYLE", "::cue(b) {", "  background-color: dark;", "}"],
    ];

    const mockCreateDefaultStyleElements = vi.fn(() => ({}));
    vi.doMock("../create_default_style_elements", () => ({
      default: () => {
        return mockCreateDefaultStyleElements();
      },
    }));
    const parseStyleBlock = ((await vi.importActual("../parse_style_block")) as any)
      .default;
    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  color: peachpuff;  background-color: dark;",
      },
      global: "",
    });
  });

  it("should take into account all cues declared in one style block", async () => {
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

    const mockCreateDefaultStyleElements = vi.fn(() => ({}));
    vi.doMock("../create_default_style_elements", () => ({
      default: () => {
        return mockCreateDefaultStyleElements();
      },
    }));
    const parseStyleBlock = ((await vi.importActual("../parse_style_block")) as any)
      .default;
    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  background-color: dark;",
      },
      global: "  color: peachpuff;",
    });
  });

  it("should consider a cue declared in multi-cue and mono-cue style blocks", async () => {
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

    const mockCreateDefaultStyleElements = vi.fn(() => ({}));
    vi.doMock("../create_default_style_elements", () => ({
      default: () => {
        return mockCreateDefaultStyleElements();
      },
    }));
    const parseStyleBlock = ((await vi.importActual("../parse_style_block")) as any)
      .default;
    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  background-color: dark;  color: salmon;",
      },
      global: "  color: peachpuff;",
    });
  });
  it("should consider a cue declared in multi-cue and mono-cue style blocks", async () => {
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

    const mockCreateDefaultStyleElements = vi.fn(() => ({}));
    vi.doMock("../create_default_style_elements", () => ({
      default: () => {
        return mockCreateDefaultStyleElements();
      },
    }));
    const parseStyleBlock = ((await vi.importActual("../parse_style_block")) as any)
      .default;
    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  background-color: dark;  color: salmon;",
      },
      global: "  color: peachpuff;",
    });
  });

  it("should consider multiple class declaration for one stylesheet", async () => {
    const webvttStyle = [
      ["STYLE", "::cue(c),", "::cue(d),", "::cue(b) {", "  background-color: dark;", "}"],
      ["STYLE", "::cue(c) {", "  color: salmon;", "}"],
    ];

    const mockCreateDefaultStyleElements = vi.fn(() => ({}));
    vi.doMock("../create_default_style_elements", () => ({
      default: () => {
        return mockCreateDefaultStyleElements();
      },
    }));
    const parseStyleBlock = ((await vi.importActual("../parse_style_block")) as any)
      .default;
    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {
        b: "  background-color: dark;",
        d: "  background-color: dark;",
        c: "  background-color: dark;  color: salmon;",
      },
      global: "",
    });
  });

  it("should return empty style if no style block", async () => {
    const webvttStyle: string[][] = [];

    const mockCreateDefaultStyleElements = vi.fn(() => ({}));
    vi.doMock("../create_default_style_elements", () => ({
      default: () => {
        return mockCreateDefaultStyleElements();
      },
    }));
    const parseStyleBlock = ((await vi.importActual("../parse_style_block")) as any)
      .default;
    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {},
      global: "",
    });
  });
});
