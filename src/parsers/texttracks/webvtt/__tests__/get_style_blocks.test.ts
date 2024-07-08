import { describe, it, expect } from "vitest";
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
