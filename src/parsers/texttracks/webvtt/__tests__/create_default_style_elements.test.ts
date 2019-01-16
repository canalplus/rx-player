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
        white: {
          isGlobalStyle: false,
          styleContent: "color: #ffffff",
        },
        bg_white: {
          isGlobalStyle: false,
          styleContent: "background-color: #ffffff",
        },
        lime: {
          isGlobalStyle: false,
          styleContent: "color: #00ff00",
        },
        bg_lime: {
          isGlobalStyle: false,
          styleContent: "background-color: #00ff00",
        },
        cyan: {
          isGlobalStyle: false,
          styleContent: "color: #00ffff",
        },
        bg_cyan: {
          isGlobalStyle: false,
          styleContent: "background-color: #00ffff",
        },
        red: {
          isGlobalStyle: false,
          styleContent: "color: #ff0000",
        },
        bg_red: {
          isGlobalStyle: false,
          styleContent: "background-color: #ff0000",
        },
        yellow: {
          isGlobalStyle: false,
          styleContent: "color: #ffff00",
        },
        bg_yellow: {
          isGlobalStyle: false,
          styleContent: "background-color: #ffff00",
        },
        magenta: {
          isGlobalStyle: false,
          styleContent: "color: #ff00ff",
        },
        bg_magenta: {
          isGlobalStyle: false,
          styleContent: "background-color: #ff00ff",
        },
        blue: {
          isGlobalStyle: false,
          styleContent: "color: #0000ff",
        },
        bg_blue: {
          isGlobalStyle: false,
          styleContent: "background-color: #0000ff",
        },
        black: {
          isGlobalStyle: false,
          styleContent: "color: #000000",
        },
        bg_black: {
          isGlobalStyle: false,
          styleContent: "background-color: #000000",
        },
      }
    );
  });
});
