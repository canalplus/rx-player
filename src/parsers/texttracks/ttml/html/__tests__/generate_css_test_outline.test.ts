import { describe, it, expect } from "vitest";
import generateCSSTextOutline from "../generate_css_test_outline";

describe("generateCSSTextOutline", () => {
  it("should return a fake outline on a text-shadow basis", () => {
    expect(generateCSSTextOutline("black", "12")).toEqual(
      "-1px -1px 12 black," +
        "1px -1px 12 black," +
        "-1px 1px 12 black," +
        "1px 1px 12 black",
    );
    expect(generateCSSTextOutline("yellow", 1)).toEqual(
      "-1px -1px 1 yellow," +
        "1px -1px 1 yellow," +
        "-1px 1px 1 yellow," +
        "1px 1px 1 yellow",
    );
  });
});
