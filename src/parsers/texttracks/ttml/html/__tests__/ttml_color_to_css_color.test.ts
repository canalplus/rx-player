import { describe, it, expect } from "vitest";
import ttmlColorToCSSColor from "../ttml_color_to_css_color";

describe("ttmlColorToCSSColor", () => {
  it("should return the given color if unrecognized", () => {
    expect(ttmlColorToCSSColor("toto")).toEqual("toto");
    expect(ttmlColorToCSSColor("ffffffff")).toEqual("ffffffff");
    expect(ttmlColorToCSSColor("ffff")).toEqual("ffff");
    expect(ttmlColorToCSSColor("#fffff")).toEqual("#fffff");
    expect(ttmlColorToCSSColor("#fgff")).toEqual("#fgff");
    expect(ttmlColorToCSSColor("#fhffffff")).toEqual("#fhffffff");
  });

  it("should translate values based on 8 hexa characters", () => {
    expect(ttmlColorToCSSColor("#ffffffff")).toEqual("rgba(255,255,255,1)");
    expect(ttmlColorToCSSColor("#ffffff00")).toEqual("rgba(255,255,255,0)");
    expect(ttmlColorToCSSColor("#8080A000")).toEqual("rgba(128,128,160,0)");
  });

  it("should translate values based on 4 hexa characters", () => {
    expect(ttmlColorToCSSColor("#ffff")).toEqual("rgba(255,255,255,1)");
    expect(ttmlColorToCSSColor("#fff0")).toEqual("rgba(255,255,255,0)");
    expect(ttmlColorToCSSColor("#88A0")).toEqual("rgba(136,136,170,0)");
  });

  it("should translate values based on rgb characters", () => {
    expect(ttmlColorToCSSColor("rgb(57, 98, 77)")).toEqual("rgb(57,98,77)");
    expect(ttmlColorToCSSColor("rgb(67,8,57)")).toEqual("rgb(67,8,57)");
  });

  it("should translate values based on rgba characters", () => {
    expect(ttmlColorToCSSColor("rgba(67,8,77,255)")).toEqual("rgba(67,8,77,1)");
    expect(ttmlColorToCSSColor("rgba(57, 98, 77, 0)")).toEqual("rgba(57,98,77,0)");
    expect(ttmlColorToCSSColor("rgba(57, 98, 77,128)")).toEqual(
      "rgba(57,98,77,0.5019607843137255)",
    );
  });
});
