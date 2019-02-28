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

describe("parsers - webvtt - parseStyleBlock", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should correctly handle empty style blocks", () => {
    const webvttStyle = [
      ["STYLE"],
      [],
    ];

    const mockCreateDefaultStyleElements = jest.fn(() => ({}));
    jest.mock("../create_default_style_elements", () => ({
      __esModule: true,
      /* tslint:disable no-inferred-empty-object-type */
      default: () => { return mockCreateDefaultStyleElements(); },
      /* tslint:enable no-inferred-empty-object-type */
    }));
    const parseStyleBlock = require("../parse_style_block").default;
    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        classes: {},
        global: "",
      }
    );
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

    const mockCreateDefaultStyleElements = jest.fn(() => ({}));
    jest.mock("../create_default_style_elements", () => ({
      __esModule: true,
      /* tslint:disable no-inferred-empty-object-type */
      default: () => { return mockCreateDefaultStyleElements(); },
      /* tslint:enable no-inferred-empty-object-type */
    }));
    const parseStyleBlock = require("../parse_style_block").default;
    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        classes: {},
        global: "background-image: linear-gradient(to bottom, dimgray, lightgray);" +
          "color: papayawhip;",
      }
    );
  });

  it("should parse class style", () => {
    const webvttStyle = [
      [
        "STYLE",
        "::cue(b) {",
        "  color: peachpuff;",
        "}",
      ],
    ];

    const mockCreateDefaultStyleElements = jest.fn(() => ({}));
    jest.mock("../create_default_style_elements", () => ({
      __esModule: true,
      /* tslint:disable no-inferred-empty-object-type */
      default: () => { return mockCreateDefaultStyleElements(); },
      /* tslint:enable no-inferred-empty-object-type */
    }));
    const parseStyleBlock = require("../parse_style_block").default;
    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        classes: {
          b: "  color: peachpuff;",
        },
        global: "",
      }
    );
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
      [
        "STYLE",
        "::cue(b) {",
        "  color: peachpuff;",
        "}",
      ],
    ];

    const mockCreateDefaultStyleElements = jest.fn(() => ({}));
    jest.mock("../create_default_style_elements", () => ({
      __esModule: true,
      /* tslint:disable no-inferred-empty-object-type */
      default: () => { return mockCreateDefaultStyleElements(); },
      /* tslint:enable no-inferred-empty-object-type */
    }));
    const parseStyleBlock = require("../parse_style_block").default;
    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        global: "background-image: linear-gradient(to bottom, dimgray, lightgray);" +
          "color: papayawhip;",
        classes: {
          b: "  color: peachpuff;",
        },
      }
    );
  });

  it("should not parse unformed styles", () => {
    const webvttStyle = [
      [
        "BAD STYLE",
      ],
      [
        "STYLE",
        "::cue(b) {",
        "  color: peachpuff;",
        "}",
      ],
    ];

    const mockCreateDefaultStyleElements = jest.fn(() => ({}));
    jest.mock("../create_default_style_elements", () => ({
      __esModule: true,
      /* tslint:disable no-inferred-empty-object-type */
      default: () => { return mockCreateDefaultStyleElements(); },
      /* tslint:enable no-inferred-empty-object-type */
    }));
    const parseStyleBlock = require("../parse_style_block").default;
    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        classes: {
          b: "  color: peachpuff;",
        },
        global: "",
      }
    );
  });

  it("should not override styles if class if declared several times", () => {
    const webvttStyle = [
      [
        "STYLE",
        "::cue(b) {",
        "  color: peachpuff;",
        "}",
      ],
      [
        "STYLE",
        "::cue(b) {",
        "  background-color: dark;",
        "}",
      ],
    ];

    const mockCreateDefaultStyleElements = jest.fn(() => ({}));
    jest.mock("../create_default_style_elements", () => ({
      __esModule: true,
      /* tslint:disable no-inferred-empty-object-type */
      default: () => { return mockCreateDefaultStyleElements(); },
      /* tslint:enable no-inferred-empty-object-type */
    }));
    const parseStyleBlock = require("../parse_style_block").default;
    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        classes: {
          b: "  color: peachpuff;  background-color: dark;",
        },
        global: "",
      }
    );
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

    const mockCreateDefaultStyleElements = jest.fn(() => ({}));
    jest.mock("../create_default_style_elements", () => ({
      __esModule: true,
      /* tslint:disable no-inferred-empty-object-type */
      default: () => { return mockCreateDefaultStyleElements(); },
      /* tslint:enable no-inferred-empty-object-type */
    }));
    const parseStyleBlock = require("../parse_style_block").default;
    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        classes: {
          b: "  background-color: dark;",
        },
        global: "  color: peachpuff;",
      }
    );
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
      [
        "STYLE",
        "::cue(b) {",
        "  color: salmon;",
        "}",
      ],
    ];

    const mockCreateDefaultStyleElements = jest.fn(() => ({}));
    jest.mock("../create_default_style_elements", () => ({
      __esModule: true,
      /* tslint:disable no-inferred-empty-object-type */
      default: () => { return mockCreateDefaultStyleElements(); },
      /* tslint:enable no-inferred-empty-object-type */
    }));
    const parseStyleBlock = require("../parse_style_block").default;
    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        classes: {
          b: "  background-color: dark;  color: salmon;",
        },
        global: "  color: peachpuff;",
      }
    );
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
      [
        "STYLE",
        "::cue(b) {",
        "  color: salmon;",
        "}",
      ],
    ];

    const mockCreateDefaultStyleElements = jest.fn(() => ({}));
    jest.mock("../create_default_style_elements", () => ({
      __esModule: true,
      /* tslint:disable no-inferred-empty-object-type */
      default: () => { return mockCreateDefaultStyleElements(); },
      /* tslint:enable no-inferred-empty-object-type */
    }));
    const parseStyleBlock = require("../parse_style_block").default;
    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        classes: {
          b: "  background-color: dark;  color: salmon;",
        },
        global: "  color: peachpuff;",
      }
    );
  });

  it("should consider multiple class declaration for one stylesheet", () => {
    const webvttStyle = [
      [
        "STYLE",
        "::cue(c),",
        "::cue(d),",
        "::cue(b) {",
        "  background-color: dark;",
        "}",
      ],
      [
        "STYLE",
        "::cue(c) {",
        "  color: salmon;",
        "}",
      ],
    ];

    const mockCreateDefaultStyleElements = jest.fn(() => ({}));
    jest.mock("../create_default_style_elements", () => ({
      __esModule: true,
      /* tslint:disable no-inferred-empty-object-type */
      default: () => { return mockCreateDefaultStyleElements(); },
      /* tslint:enable no-inferred-empty-object-type */
    }));
    const parseStyleBlock = require("../parse_style_block").default;
    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        classes: {
          b: "  background-color: dark;",
          d: "  background-color: dark;",
          c: "  background-color: dark;  color: salmon;",
        },
        global: "",
      }
    );
  });

  it("should return empty style if no style block", () => {
    const webvttStyle: string[][] = [];

    const mockCreateDefaultStyleElements = jest.fn(() => ({}));
    jest.mock("../create_default_style_elements", () => ({
      __esModule: true,
      /* tslint:disable no-inferred-empty-object-type */
      default: () => { return mockCreateDefaultStyleElements(); },
      /* tslint:enable no-inferred-empty-object-type */
    }));
    const parseStyleBlock = require("../parse_style_block").default;
    expect(parseStyleBlock(webvttStyle)).toEqual({
      classes: {},
      global: "",
    });
  });
});
