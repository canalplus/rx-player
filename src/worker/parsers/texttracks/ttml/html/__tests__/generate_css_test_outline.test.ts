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

import generateCSSTextOutline from "../generate_css_test_outline";

describe("generateCSSTextOutline", () => {
  it("should return a fake outline on a text-shadow basis", () => {
    expect(generateCSSTextOutline("black", "12"))
      .toEqual("-1px -1px 12 black," +
        "1px -1px 12 black," +
        "-1px 1px 12 black," +
        "1px 1px 12 black");
    expect(generateCSSTextOutline("yellow", 1))
      .toEqual("-1px -1px 1 yellow," +
        "1px -1px 1 yellow," +
        "-1px 1px 1 yellow," +
        "1px 1px 1 yellow");
  });
});
