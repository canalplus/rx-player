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

import createDefaultStyleElements from "../html/create_default_style_elements";

describe("parsers - webvtt - createDefaultStyleElements", () => {
  it("should return expected default style elements", () => {
    expect(createDefaultStyleElements()).toEqual(
      {
        white: "color: #ffffff",
        bg_white: "background-color: #ffffff",
        lime: "color: #00ff00",
        bg_lime: "background-color: #00ff00",
        cyan: "color: #00ffff",
        bg_cyan: "background-color: #00ffff",
        red: "color: #ff0000",
        bg_red: "background-color: #ff0000",
        yellow: "color: #ffff00",
        bg_yellow: "background-color: #ffff00",
        magenta: "color: #ff00ff",
        bg_magenta: "background-color: #ff00ff",
        blue: "color: #0000ff",
        bg_blue: "background-color: #0000ff",
        black: "color: #000000",
        bg_black: "background-color: #000000",
      }
    );
  });
});
