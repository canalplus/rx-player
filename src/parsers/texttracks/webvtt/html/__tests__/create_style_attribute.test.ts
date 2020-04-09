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

import createStyleAttribute from "../create_style_attribute";

describe("parsers - webvtt - createStyleAttribute", () => {
  const baseStyle = "position: absolute; margin:0;";
  const baseWidth = "width:100%;";
  const baseLeft = "left:50%;";
  const baseTransform = "transform:translate(-50%,0%);";
  const style = baseStyle + baseWidth + baseLeft + baseTransform;

  it("should set width", () => {
    const settings = {
      size: "30%",
    };

    const attribute = createStyleAttribute(settings);

    const expected = baseStyle + baseLeft + baseTransform + "width:30%;";
    isEqualStyle(attribute.value, expected);
  });

  it("should set horizontal position", () => {
    const settings = {
      position: "10%",
    };

    const attribute = createStyleAttribute(settings);

    const expected = baseStyle + baseWidth + baseTransform + "left:10%;";
    isEqualStyle(attribute.value, expected);
  });

  it("should set horizontal position with alignment", () => {
    const settings = {
      position: "10%,line-left",
    };

    const attribute = createStyleAttribute(settings);

    const expected = baseStyle + baseWidth + "transform:translate(0%, 0%);" + "left:10%;";
    isEqualStyle(attribute.value, expected);
  });

  it("should set horizontal position and position alignment based on align if no position present", () => {
    const settings = {
      align: "right",
    };

    const attribute = createStyleAttribute(settings);

    const expected = baseStyle + baseWidth + "left:100%;" + "transform:translate(-100%, 0%);" + "text-align:right;";
    isEqualStyle(attribute.value, expected);
  });

  it("should set vertical position", () => {
    const settings = {
      line: "0%",
    };

    const attribute = createStyleAttribute(settings);

    const expected = baseStyle + baseLeft + baseWidth + "top:0%;" + "transform:translate(-50%, 0%);";
    isEqualStyle(attribute.value, expected);
  });

  it("should set vertical position with line alignment", () => {
    const settings = {
      line: "10%,center",
    };

    const attribute = createStyleAttribute(settings);

    const expected = baseStyle + baseLeft + baseWidth + "top:10%;" + "transform:translate(-50%, -50%);";
    isEqualStyle(attribute.value, expected);
  });

  it("should set text align", () => {
    const settings = {
      align: "center",
    };

    const attribute = createStyleAttribute(settings);

    const expected = style + "text-align:center";
    isEqualStyle(attribute.value, expected);
  });
});

 const isEqualStyle = (style1: string, style2: string) => {
  const uniform = (str: string) => str.split(";")
    .map(s => s.replace(" ", ""))
    .filter(s => s !== "")
    .sort();
  expect(
    uniform(style1)
  ).toEqual(
    uniform(style2)
  );
};
