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
    expect(ttmlColorToCSSColor("#ffffffff"))
      .toEqual("rgba(255,255,255,1)");
    expect(ttmlColorToCSSColor("#ffffff00"))
      .toEqual("rgba(255,255,255,0)");
    expect(ttmlColorToCSSColor("#8080A000"))
      .toEqual("rgba(128,128,160,0)");
  });

  it("should translate values based on 4 hexa characters", () => {
    expect(ttmlColorToCSSColor("#ffff"))
      .toEqual("rgba(255,255,255,1)");
    expect(ttmlColorToCSSColor("#fff0"))
      .toEqual("rgba(255,255,255,0)");
    expect(ttmlColorToCSSColor("#88A0"))
      .toEqual("rgba(136,136,170,0)");
  });
});
