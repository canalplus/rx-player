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

import flatMap from "../flat_map";

/* tslint:disable no-unbound-method */
const initialFlatMap = (Array.prototype as any).flatMap;
/* tslint:enable no-unbound-method */

describe("utils - starts-with", () => {
  beforeEach(() => {
    (Array.prototype as any).flatMap = undefined;
  });

  afterEach(() => {
   (Array.prototype as any).flatMap = initialFlatMap;
  });

  it("should mirror Array.prototype.flatMap behavior", () => {
    expect(flatMap([1, 2, 3], x => [x, x + 1, x - 1]))
             .toEqual([ 1, 2, 0, 2, 3, 1, 3, 4, 2 ]);
    expect(flatMap([1, 2, 3], x => `${x}a`))
             .toEqual([ "1a", "2a", "3a" ]);
  });

  if (typeof initialFlatMap === "function") {
    it("should call the original flatMap function if available", () => {
      (Array.prototype as any).flatMap = initialFlatMap;
      const flatMapSpy = jest.spyOn((Array.prototype as any), "flatMap");
      const func1 = (x : number) : number[] => [x, x + 1, x - 1];
      const func2 = (x : number) : string => String(x) + "a";
      expect(flatMap([1, 2, 3], func1))
               .toEqual([ 1, 2, 0, 2, 3, 1, 3, 4, 2 ]);
      expect(flatMap([1, 2, 3], func2))
               .toEqual([ "1a", "2a", "3a" ]);

      expect(flatMapSpy).toHaveBeenCalledTimes(2);
      expect(flatMapSpy).toHaveBeenNthCalledWith(1, func1);
      expect(flatMapSpy).toHaveBeenNthCalledWith(2, func2);
      flatMapSpy.mockRestore();
    });
  }
});
