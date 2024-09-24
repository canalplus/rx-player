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

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import flatMap from "../flat_map";

interface IProtoWithFlatMap {
  flatMap?:
    | (<U, This = undefined>(
        callback: (
          this: This,
          value: unknown,
          index: number,
          array: unknown[],
        ) => U | U[],
        thisArg?: This,
      ) => U[])
    | undefined;
}

const proto = Array.prototype as unknown as IProtoWithFlatMap;

/* eslint-disable @typescript-eslint/unbound-method */
const initialFlatMap = proto.flatMap;
/* eslint-enable @typescript-eslint/unbound-method */

describe("utils - starts-with", () => {
  beforeEach(() => {
    delete proto.flatMap;
  });

  afterEach(() => {
    proto.flatMap = initialFlatMap;
  });

  it("should mirror prototype.flatMap behavior", () => {
    expect(flatMap([1, 2, 3], (x) => [x, x + 1, x - 1])).toEqual([
      1, 2, 0, 2, 3, 1, 3, 4, 2,
    ]);
    expect(flatMap([1, 2, 3], (x) => `${x}a`)).toEqual(["1a", "2a", "3a"]);
  });

  if (typeof initialFlatMap === "function") {
    it("should call the original flatMap function if available", () => {
      proto.flatMap = initialFlatMap;
      // TODO find what bother typescript here instead of adding "as any"
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const mockFlatMap = jest.spyOn(proto as any, "flatMap");
      const func1 = (x: number): number[] => [x, x + 1, x - 1];
      const func2 = (x: number): string => String(x) + "a";
      expect(flatMap([1, 2, 3], func1)).toEqual([1, 2, 0, 2, 3, 1, 3, 4, 2]);
      expect(flatMap([1, 2, 3], func2)).toEqual(["1a", "2a", "3a"]);

      expect(mockFlatMap).toHaveBeenCalledTimes(2);
      expect(mockFlatMap).toHaveBeenNthCalledWith(1, func1);
      expect(mockFlatMap).toHaveBeenNthCalledWith(2, func2);
      mockFlatMap.mockRestore();
    });
  }
});
