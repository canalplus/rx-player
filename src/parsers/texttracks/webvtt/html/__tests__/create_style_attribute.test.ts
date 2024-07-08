import { describe, it, expect } from "vitest";
import createStyleAttribute from "../create_style_attribute";

describe("parsers - webvtt - createStyleAttribute", () => {
  const alwaysAppliedStyle = "position: absolute; margin:0;";
  const defaultWidth = "width:100%;";
  const defaultLeft = "left:50%;";
  const defaultTransform = "transform:translate(-50%,0%);";
  const defaultTop = "top:auto;";
  const defaultTextAlign = "text-align:center;";
  const style =
    alwaysAppliedStyle +
    defaultWidth +
    defaultLeft +
    defaultTop +
    defaultTextAlign +
    defaultTransform;

  it("should set width", () => {
    const settings = {
      size: "30%",
    };

    const attribute = createStyleAttribute(settings);

    const expected =
      alwaysAppliedStyle +
      defaultLeft +
      defaultTop +
      defaultTextAlign +
      defaultTransform +
      "width:30%;";
    isEqualStyle(attribute.value, expected);
  });

  it("should set horizontal position", () => {
    const settings = {
      position: "10%",
    };

    const attribute = createStyleAttribute(settings);

    const expected =
      alwaysAppliedStyle +
      defaultWidth +
      defaultTop +
      defaultTextAlign +
      defaultTransform +
      "left:10%;";
    isEqualStyle(attribute.value, expected);
  });

  it("should set horizontal position with alignment", () => {
    const settings = {
      position: "10%,line-left",
    };

    const attribute = createStyleAttribute(settings);

    const expected =
      alwaysAppliedStyle +
      defaultWidth +
      defaultTop +
      defaultTextAlign +
      "transform:translate(0%, 0%);" +
      "left:10%;";
    isEqualStyle(attribute.value, expected);
  });

  it("should set horizontal position and position alignment based on align if no position present", () => {
    const settings = {
      align: "right",
    };

    const attribute = createStyleAttribute(settings);

    const expected =
      alwaysAppliedStyle +
      defaultWidth +
      defaultTop +
      "left:100%;" +
      "transform:translate(-100%, 0%);" +
      "text-align:right;";
    isEqualStyle(attribute.value, expected);
  });

  it("should set vertical position", () => {
    const settings = {
      line: "0%",
    };

    const attribute = createStyleAttribute(settings);

    const expected =
      alwaysAppliedStyle +
      defaultWidth +
      defaultLeft +
      defaultTextAlign +
      "top:0%;" +
      "transform:translate(-50%, 0%);";
    isEqualStyle(attribute.value, expected);
  });

  it("should set vertical position with line alignment", () => {
    const settings = {
      line: "10%,center",
    };

    const attribute = createStyleAttribute(settings);

    const expected =
      alwaysAppliedStyle +
      defaultWidth +
      defaultLeft +
      defaultTextAlign +
      "top:10%;" +
      "transform:translate(-50%, -50%);";
    isEqualStyle(attribute.value, expected);
  });

  it("should set text align", () => {
    const settings = {
      align: "center",
    };

    const attribute = createStyleAttribute(settings);

    isEqualStyle(attribute.value, style);
  });
});

const isEqualStyle = (style1: string, style2: string) => {
  const uniform = (str: string) =>
    str
      .split(";")
      .map((s) => s.replace(" ", ""))
      .filter((s) => s !== "")
      .sort();
  expect(uniform(style1)).toEqual(uniform(style2));
};
