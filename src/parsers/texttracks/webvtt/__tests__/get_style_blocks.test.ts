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

import getStyleBlocks from "../get_style_blocks";

const webvtt1 = [
  "WEBVTT",
  "",
  "STYLE",
  "::cue {",
  "  background-image: linear-gradient(to bottom, dimgray, lightgray);",
  "  color: papayawhip;",
  "}",
  '/* Style blocks cannot use blank lines nor "dash dash greater than" */',
  "",
  "NOTE comment blocks can be used between style blocks.",
  "",
  "STYLE",
  "::cue(b) {",
  "  color: peachpuff;",
  "}",
  "",
  "00:00:00.000 --> 00:00:10.000",
  "- Hello <b>world</b>.",
  "",
  "NOTE style blocks cannot appear after the first cue.",
  "",
  "00:05:00.000 --> 00:06:10.000",
  "Rendez-vous on Champs-Elysees",
  "",
];

describe("parsers - webvtt - getStyleBlocks", () => {
  it("should return only style blocks from a webvtt", () => {
    expect(getStyleBlocks(webvtt1, 1)).toEqual([
      [
        "STYLE",
        "::cue {",
        "  background-image: linear-gradient(to bottom, dimgray, lightgray);",
        "  color: papayawhip;",
        "}",
        '/* Style blocks cannot use blank lines nor "dash dash greater than" */',
      ],
      ["STYLE", "::cue(b) {", "  color: peachpuff;", "}"],
    ]);
  });
});
