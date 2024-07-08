import { describe, it, expect } from "vitest";
import createDefaultStyleElements from "../create_default_style_elements";

/* eslint-disable @typescript-eslint/naming-convention */

describe("parsers - webvtt - createDefaultStyleElements", () => {
  it("should return expected default style elements", () => {
    expect(createDefaultStyleElements()).toEqual({
      white: "color: #ffffff;",
      bg_white: "background-color: #ffffff;",
      lime: "color: #00ff00;",
      bg_lime: "background-color: #00ff00;",
      cyan: "color: #00ffff;",
      bg_cyan: "background-color: #00ffff;",
      red: "color: #ff0000;",
      bg_red: "background-color: #ff0000;",
      yellow: "color: #ffff00;",
      bg_yellow: "background-color: #ffff00;",
      magenta: "color: #ff00ff;",
      bg_magenta: "background-color: #ff00ff;",
      blue: "color: #0000ff;",
      bg_blue: "background-color: #0000ff;",
      black: "color: #000000;",
      bg_black: "background-color: #000000;",
    });
  });
});
