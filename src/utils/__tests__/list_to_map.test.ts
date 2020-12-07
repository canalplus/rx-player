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

/**
 * This file contains functions helping with TimeRanges management.
 *
 * For simplicity/performance reasons, many of those work with a simplified
 * "Range" object, which is an object with two keys:
 *   - start {Number}
 *   - end {Number}
 *
 * Those two corresponds to what is returned by the start and end methods of a
 * TimeRanges Object.
 *
 * You can convert from TimeRanges to Range object(s) with the getRange/
 * convertToRanges methods.
 */

import listToMap from "../list_to_map";

describe("utils - listToMap", () => {
  it("should return an empty object for an empty array", () => {
    expect(listToMap([])).toEqual({});
  });
  it("should correctly process array of strings", () => {
    expect(listToMap(["a", "foo", "bar", "c"])).toEqual({
      a: "a",
      foo: "foo",
      bar: "bar",
      c: "c",
    });
  });
});
