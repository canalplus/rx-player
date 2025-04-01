import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import flatMap from "../flat_map";

type ICustomArrayProto = Omit<typeof Array.prototype, "flatMap"> & {
  flatMap?: typeof Array.prototype.flatMap | undefined;
};

const proto: ICustomArrayProto = Array.prototype;

const initialFlatMap = proto.flatMap;

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
      const mockFlatMap = vi.spyOn(Array.prototype, "flatMap");
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
