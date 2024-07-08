import { describe, it, expect } from "vitest";
import { fromIndexTime, getTimescaledRange, toIndexTime } from "../index_helpers";

describe("Manifest parser index helpers", () => {
  describe("fromIndexTime", () => {
    it("should convert the given index time to a media time", () => {
      expect(fromIndexTime(10000, { timescale: 1, indexTimeOffset: 1000 })).toBe(9000);
      expect(fromIndexTime(10000, { timescale: 10, indexTimeOffset: 1000 })).toBe(900);
    });
  });
  describe("toIndexTime", () => {
    it("should convert the given media time to an index time", () => {
      expect(toIndexTime(900, { timescale: 1, indexTimeOffset: 100 })).toBe(1000);
      expect(toIndexTime(900, { timescale: 10, indexTimeOffset: 1000 })).toBe(10000);
    });
  });

  describe("getTimescaledRange", () => {
    it("should re-scale the time given", () => {
      expect(getTimescaledRange(6, 5, 5)).toEqual([30, 55]);
      expect(getTimescaledRange(15, 5, 1)).toEqual([15, 20]);
      expect(getTimescaledRange(15, 5, 10)).toEqual([150, 200]);
    });
  });
});
