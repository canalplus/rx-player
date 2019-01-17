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

import parseStyleBlock from "../../html/parse_style_block";

describe("parsers - webvtt - parseStyleBlock", () => {
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

    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        __global__: "background-image:linear-gradient(tobottom,dimgray,lightgray);" +
          "color:papayawhip;",
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

    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        b: "color:peachpuff;",
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

    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        __global__: "background-image:linear-gradient(tobottom,dimgray,lightgray);" +
          "color:papayawhip;",
        b: "color:peachpuff;",
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

    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        b: "color:peachpuff;",
      }
    );
  });

  it("should override styles if class if declared several times", () => {
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

    expect(parseStyleBlock(webvttStyle)).toEqual(
      {
        b: "background-color:dark;",
      }
    );
  });

  it("should return empty style if no style block", () => {
    const webvttStyle: string[][] = [];
    expect(parseStyleBlock(webvttStyle)).toEqual({});
  });
});
