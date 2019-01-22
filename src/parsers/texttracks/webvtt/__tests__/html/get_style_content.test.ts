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

import getStyleContent from "../../html/get_style_content";

describe("parsers - webvtt - getStyleContent", () => {
  it("should correclty get style contents", () => {
    const webvttStyle = [
        "background-image: linear-gradient(to bottom, dimgray, lightgray);",
        "color: papayawhip;",
      "}",
    ];
    expect(getStyleContent(webvttStyle)).toEqual(
      "background-image: linear-gradient(to bottom, dimgray, lightgray);" +
      "color: papayawhip;"
    );
  });

  it("should return empty string if get content from empty array", () => {
    const webvttStyle: string[] = [];
    expect(getStyleContent(webvttStyle)).toEqual("");
  });
});
