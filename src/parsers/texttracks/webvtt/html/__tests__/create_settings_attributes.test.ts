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

import createSettingsAttributes from "../create_settings_attributes";

describe("parsers - webvtt - createSettingsAttributes", () => {
  const baseStyle = "position: absolute; margin:0;";
  const baseLeft = "left:50%;";
  const baseTransform = "transform:translate(-50%,-50%);";
  const style = baseStyle + baseLeft + baseTransform;

  it("should set width", () => {
    const settings = {
      size: "30%",
    };

    const attributes = createSettingsAttributes(settings);

    const expected = style + "width:30%;";
    isEqualStyle(attributes.value, expected);
  });

  it("should set horizontal position, start", () => {
    const settings = {
      position: "0%",
    };

    const attributes = createSettingsAttributes(settings);

    const expected = baseStyle + "left:0%;" + "transform:translate(-0%, -50%);";
    isEqualStyle(attributes.value, expected);
  });

  it("should set horizontal position, end", () => {
    const settings = {
      position: "100%",
    };

    const attributes = createSettingsAttributes(settings);

    const expected = baseStyle + "left:100%;" + "transform:translate(-100%, -50%);";
    isEqualStyle(attributes.value, expected);
  });

  it("should set horizontal position, middle value", () => {
    const settings = {
      position: "60%",
    };

    const attributes = createSettingsAttributes(settings);

    const expected = baseStyle + baseTransform + "left:60%;";
    isEqualStyle(attributes.value, expected);
  });

  it("should set vertical position, top", () => {
    const settings = {
      line: "0%",
    };

    const attributes = createSettingsAttributes(settings);

    const expected = baseStyle + baseLeft + "top:0%;" + "transform:translate(-50%, -0%);";
    isEqualStyle(attributes.value, expected);
  });

  it("should set vertical position, end", () => {
    const settings = {
      line: "100%",
    };

    const attributes = createSettingsAttributes(settings);

    const expected = baseStyle + baseLeft + "top:100%;" + "transform:translate(-50%, -100%);";
    isEqualStyle(attributes.value, expected);
  });

  it("should set vertical position, middle value", () => {
    const settings = {
     line: "60%",
    };

    const attributes = createSettingsAttributes(settings);

    const expected = style + "top:60%;";
    isEqualStyle(attributes.value, expected);
  });

  it("should set text align", () => {
    const settings = {
      align: "middle",
    };

    const attributes = createSettingsAttributes(settings);

    const expected = style + "text-align:center";
    isEqualStyle(attributes.value, expected);
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
