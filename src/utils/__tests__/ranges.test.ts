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

import {
  convertToRanges,
  excludeFromRanges,
  getInnerAndOuterTimeRanges,
  getLeftSizeOfRange,
  getNextRangeGap,
  getPlayedSizeOfRange,
  getRange,
  getSizeOfRange,
  insertInto,
  isAfter,
  isBefore,
  isTimeInRange,
  isTimeInRanges,
  keepRangeIntersection,
  mergeContiguousRanges,
  removeEmptyRanges,
} from "../ranges";

/**
 * Construct TimeRanges implementation from Array of tuples:
 * [ start : number, end : number ]
 * @param {Array.<Array.<number>>} base
 * @returns {Object}
 */
function constructTimeRanges(base: Array<[number, number]>) : TimeRanges {
  const starts : number[] = [];
  const ends : number[] = [];
  const timeRanges = {
    length: 0,
    start(nb : number) : number {
      if (nb >= timeRanges.length) {
        throw new Error("Invalid index.");
      }
      return starts[nb];
    },
    end(nb : number) : number {
      if (nb >= timeRanges.length) {
        throw new Error("Invalid index.");
      }
      return ends[nb];
    },
  };

  base.forEach((element) => {
    starts.push(element[0]);
    ends.push(element[1]);
    timeRanges.length += 1;
  });

  return timeRanges;
}

describe("utils - ranges", () => {
  describe("convertToRanges", () => {
    it("should convert TimeRanges to custom Ranges implementation", () => {
      const times : Array<[number, number]> = [
        [0, 10],
        [20, 30],
        [50, 70],
      ];

      const timeRanges = constructTimeRanges(times);
      const ranges = convertToRanges(timeRanges);
      expect(ranges).toEqual([
        {
          start: 0,
          end: 10,
        },
        {
          start: 20,
          end: 30,
        },
        {
          start: 50,
          end: 70,
        },
      ]);
    });

    it("should return empty array if no timerange is given", () => {
      const times : Array<[number, number]> = [];

      const timeRanges = constructTimeRanges(times);
      const ranges = convertToRanges(timeRanges);
      expect(ranges).toEqual([]);
    });
  });

  describe("getInnerAndOuterTimeRanges", () => {
    /* tslint:disable max-line-length */
    it("should get inner range and outer ranges with the given TimeRanges and number", () => {
    /* tslint:enable max-line-length */
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getInnerAndOuterTimeRanges(timeRanges, 0))
        .toEqual({
          outerRanges: [
            {
              start: 20,
              end: 30,
            },
            {
              start: 50,
              end: 70,
            },
          ],
          innerRange: {
            start: 0,
            end: 10,
          },
        });
      expect(getInnerAndOuterTimeRanges(timeRanges, 9))
        .toEqual({
          outerRanges: [
            {
              start: 20,
              end: 30,
            },
            {
              start: 50,
              end: 70,
            },
          ],
          innerRange: {
            start: 0,
            end: 10,
          },
        });
      expect(getInnerAndOuterTimeRanges(timeRanges, 29))
        .toEqual({
          outerRanges: [
            {
              start: 0,
              end: 10,
            },
            {
              start: 50,
              end: 70,
            },
          ],
          innerRange: {
            start: 20,
            end: 30,
          },
        });
    });

    it("should return a null innerRange if the number given isn't in any range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getInnerAndOuterTimeRanges(timeRanges, 10))
        .toEqual({
          outerRanges: [
            {
              start: 0,
              end: 10,
            },
            {
              start: 20,
              end: 30,
            },
            {
              start: 50,
              end: 70,
            },
          ],
          innerRange: null,
        });
      expect(getInnerAndOuterTimeRanges(timeRanges, 80))
        .toEqual({
          outerRanges: [
            {
              start: 0,
              end: 10,
            },
            {
              start: 20,
              end: 30,
            },
            {
              start: 50,
              end: 70,
            },
          ],
          innerRange: null,
        });
    });

    /* tslint:disable max-line-length */
    it("should return an empty outerRanges if the number given is in the single range given", () => {
    /* tslint:enable max-line-length */
      const timeRanges = constructTimeRanges([
        [20, 30],
      ]);
      expect(getInnerAndOuterTimeRanges(timeRanges, 20))
        .toEqual({
          outerRanges: [],
          innerRange: {
            start: 20,
            end: 30,
          },
        });
    });

    it("should return null ane empty array if no timerange is given", () => {
      const times : Array<[number, number]> = [];
      const timeRanges = constructTimeRanges(times);
      expect(getInnerAndOuterTimeRanges(timeRanges, 0))
        .toEqual({
          outerRanges: [],
          innerRange: null,
        });
      expect(getInnerAndOuterTimeRanges(timeRanges, 0))
        .toEqual({
          outerRanges: [],
          innerRange: null,
        });
    });
  });

  describe("getLeftSizeOfRange", () => {
    it("should return the left time to play in the current time range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getLeftSizeOfRange(timeRanges, 0)).toBe(10 - 0);
      expect(getLeftSizeOfRange(timeRanges, 9.9)).toBe(10 - 9.9);
      expect(getLeftSizeOfRange(timeRanges, 54.6)).toBe(70 - 54.6);
    });

    it("should return Infinity if the given time is at the edge of a range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getLeftSizeOfRange(timeRanges, 10)).toBe(Infinity);
      expect(getLeftSizeOfRange(timeRanges, 30)).toBe(Infinity);
      expect(getLeftSizeOfRange(timeRanges, 70)).toBe(Infinity);
    });

    it("should return Infinity if the given time is not in any range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getLeftSizeOfRange(timeRanges, 15)).toBe(Infinity);
      expect(getLeftSizeOfRange(timeRanges, 38)).toBe(Infinity);
      expect(getLeftSizeOfRange(timeRanges, -Infinity)).toBe(Infinity);
      expect(getLeftSizeOfRange(timeRanges, Infinity)).toBe(Infinity);
    });
  });

  describe("getNextRangeGap", () => {
    /* tslint:disable max-line-length */
    it("should return gap until next range if the given number is not in any range", () => {
    /* tslint:enable max-line-length */
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getNextRangeGap(timeRanges, 15.6)).toBe(20 - 15.6);
      expect(getNextRangeGap(timeRanges, 30)).toBe(50 - 30);
    });

    /* tslint:disable max-line-length */
    it("should return gap until next range if the given number is in a range", () => {
    /* tslint:enable max-line-length */
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getNextRangeGap(timeRanges, 0)).toBe(20 - 0);
      expect(getNextRangeGap(timeRanges, 20.5)).toBe(50 - 20.5);
    });

    it("should return Infinity when we are in the last time range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getNextRangeGap(timeRanges, 50)).toBe(Infinity);
      expect(getNextRangeGap(timeRanges, 58.5)).toBe(Infinity);
    });

    it("should return Infinity when we are after the last time range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getNextRangeGap(timeRanges, Infinity)).toBe(Infinity);
      expect(getNextRangeGap(timeRanges, 70)).toBe(Infinity);
    });
  });

  describe("getPlayedSizeOfRange", () => {
    it("should return the time before the current time in the current range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getPlayedSizeOfRange(timeRanges, 0)).toBe(0 - 0);
      expect(getPlayedSizeOfRange(timeRanges, 9.9)).toBe(9.9 - 0);
      expect(getPlayedSizeOfRange(timeRanges, 54.6)).toBe(54.6 - 50);
    });

    it("should return 0 if the given time is at the edge of a range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getPlayedSizeOfRange(timeRanges, 10)).toBe(0);
      expect(getPlayedSizeOfRange(timeRanges, 30)).toBe(0);
      expect(getPlayedSizeOfRange(timeRanges, 70)).toBe(0);
    });

    it("should return 0 if the given time is not in any range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getPlayedSizeOfRange(timeRanges, 15)).toBe(0);
      expect(getPlayedSizeOfRange(timeRanges, 38)).toBe(0);
      expect(getPlayedSizeOfRange(timeRanges, -Infinity)).toBe(0);
      expect(getPlayedSizeOfRange(timeRanges, Infinity)).toBe(0);
    });
  });

  describe("getRange", () => {
    it("should return the current range from the TimeRanges given", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getRange(timeRanges, 0)).toEqual({
        start: 0,
        end: 10,
      });
      expect(getRange(timeRanges, 9.9)).toEqual({
        start: 0,
        end: 10,
      });
      expect(getRange(timeRanges, 54.6)).toEqual({
        start: 50,
        end: 70,
      });
    });

    it("should return null if the given time is at the edge of a range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getRange(timeRanges, 10)).toEqual(null);
      expect(getRange(timeRanges, 30)).toEqual(null);
      expect(getRange(timeRanges, 70)).toEqual(null);
    });

    it("should return null if the given time is not in any range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getRange(timeRanges, 15)).toEqual(null);
      expect(getRange(timeRanges, 38)).toEqual(null);
      expect(getRange(timeRanges, -Infinity)).toEqual(null);
      expect(getRange(timeRanges, Infinity)).toEqual(null);
    });
  });

  describe("getSizeOfRange", () => {
    it("should return the size of the current range from the TimeRanges given", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getSizeOfRange(timeRanges, 0)).toBe(10);
      expect(getSizeOfRange(timeRanges, 9.9)).toBe(10);
      expect(getSizeOfRange(timeRanges, 54.6)).toBe(20);
    });

    it("should return 0 if the given time is at the edge of a range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getSizeOfRange(timeRanges, 10)).toBe(0);
      expect(getSizeOfRange(timeRanges, 30)).toBe(0);
      expect(getSizeOfRange(timeRanges, 70)).toBe(0);
    });

    it("should return null if the given time is not in any range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getSizeOfRange(timeRanges, 15)).toBe(0);
      expect(getSizeOfRange(timeRanges, 38)).toBe(0);
      expect(getSizeOfRange(timeRanges, -Infinity)).toBe(0);
      expect(getSizeOfRange(timeRanges, Infinity)).toBe(0);
    });
  });

  describe("keepRangeIntersection", () => {
    it("should return the same range if both given are equal", () => {
      const timeRanges = [
        { start: 0, end: 10 },
        { start: 20, end: 30 },
        { start: 50, end: 70 },
      ];
      expect(keepRangeIntersection(timeRanges, timeRanges)).toEqual(timeRanges);
    });

    it("should return the other range if one of it contains the other", () => {
      const timeRanges1 = [
        { start: 0, end: 10 },
        { start: 20, end: 30 },
        { start: 50, end: 70 },
      ];
      const timeRanges2 = [
        { start: 0, end: 70},
        { start: 90, end: 100},
        { start: 100, end: 120},
      ];
      expect(keepRangeIntersection(timeRanges1, timeRanges2)).toEqual(timeRanges1);
      expect(keepRangeIntersection(timeRanges2, timeRanges1)).toEqual(timeRanges1);
    });

    it("should return the intersection between two ranges", () => {
      const timeRanges1 = [
        { start: 0, end: 10 },
        { start: 20, end: 30 },
        { start: 50, end: 70 },
      ];
      const timeRanges2 = [
        { start: 5, end: 24},
        { start: 27, end: 29},
        { start: 40, end: 80},
      ];
      const result = [
        { start: 5, end: 10 },
        { start: 20, end: 24 },
        { start: 27, end: 29 },
        { start: 50, end: 70 },
      ];
      expect(keepRangeIntersection(timeRanges1, timeRanges2)).toEqual(result);
      expect(keepRangeIntersection(timeRanges2, timeRanges1)).toEqual(result);
    });
  });

  describe("excludeFromRanges", () => {
    it("should return no range if both given are equal", () => {
      const timeRanges = [
        { start: 0, end: 10 },
        { start: 20, end: 30 },
        { start: 50, end: 70 },
      ];
      expect(excludeFromRanges(timeRanges, timeRanges)).toEqual([]);
    });

    it("should return no range if the second contains the first", () => {
      const timeRanges1 = [
        { start: 0, end: 10 },
        { start: 20, end: 30 },
        { start: 50, end: 70 },
      ];
      const timeRanges2 = [
        { start: 0, end: 70},
        { start: 90, end: 100},
        { start: 100, end: 120},
      ];
      expect(excludeFromRanges(timeRanges1, timeRanges2)).toEqual([]);
    });

    /* tslint:disable max-line-length */
    it("should return the part of the first range not included in the second range", () => {
    /* tslint:enable max-line-length */
      const timeRanges1 = [
        { start: 10, end: 50 },
        { start: 80, end: 90 },
        { start: 105, end: 123 },
        { start: 150, end: 190 },
      ];
      const timeRanges2 = [
        { start: 20, end: 24 },
        { start: 40, end: 83 },
        { start: 105, end: 106 },
        { start: 106, end: 109 },
        { start: 120, end: 123 },
      ];
      const result = [
        { start: 10, end: 20 },
        { start: 24, end: 40 },
        { start: 83, end: 90 },
        { start: 109, end: 120 },
        { start: 150, end: 190 },
      ];
      expect(excludeFromRanges(timeRanges1, timeRanges2)).toEqual(result);
    });
  });

  describe("isTimeInRange", () => {
    it("should return true if the given time is equal to the start of the range", () => {
      expect(isTimeInRange({ start: 30, end: 70 }, 30)).toBe(true);
      expect(isTimeInRange({ start: 72, end: Infinity }, 72)).toBe(true);
      expect(isTimeInRange({ start: 0, end: 1 }, 0)).toBe(true);
    });
    it("should return false if the given time is equal to the end of the range", () => {
      expect(isTimeInRange({ start: 30, end: 70 }, 70)).toBe(false);
      expect(isTimeInRange({ start: 72, end: Infinity }, Infinity)).toBe(false);
      expect(isTimeInRange({ start: 0, end: 1 }, 1)).toBe(false);
    });
    it("should return true if the given time is inside the range", () => {
      expect(isTimeInRange({ start: 30, end: 70 }, 40)).toBe(true);
      expect(isTimeInRange({ start: 72, end: Infinity }, 10000)).toBe(true);
      expect(isTimeInRange({ start: 0, end: 1 }, 0.5)).toBe(true);
    });
    it("should return false if the given time is not inside the range", () => {
      expect(isTimeInRange({ start: 30, end: 70 }, 20)).toBe(false);
      expect(isTimeInRange({ start: 30, end: 70 }, 80)).toBe(false);
      expect(isTimeInRange({ start: 72, end: Infinity }, 70)).toBe(false);
      expect(isTimeInRange({ start: 0, end: 1 }, 7)).toBe(false);
    });
  });

  describe("isTimeInRanges", () => {
    it("should return false for no range", () => {
      expect(isTimeInRanges([], 72)).toBe(false);
      expect(isTimeInRanges([], 0)).toBe(false);
      expect(isTimeInRanges([], -Infinity)).toBe(false);
      expect(isTimeInRanges([], Infinity)).toBe(false);
      expect(isTimeInRanges([], NaN)).toBe(false);
    });

    /* tslint:disable max-line-length */
    it("should return true if the given time is equal to the start of one of the ranges", () => {
    /* tslint:enable max-line-length */
      const ranges = [ { start: 0, end: 1 },
                       { start: 30, end: 70 },
                       { start: 72, end: 74 },
                       { start: 74, end: Infinity } ];
      expect(isTimeInRanges(ranges, 30)).toBe(true);
      expect(isTimeInRanges(ranges, 72)).toBe(true);
      expect(isTimeInRanges(ranges, 74)).toBe(true);
      expect(isTimeInRanges(ranges, 0)).toBe(true);
    });

    /* tslint:disable max-line-length */
    it("should return false if the given time is only the end of one of the ranges", () => {
    /* tslint:enable max-line-length */
      const ranges = [ { start: 0, end: 1 },
                       { start: 30, end: 70 },
                       { start: 72, end: 74 },
                       { start: 74, end: Infinity } ];
      expect(isTimeInRanges(ranges, 1)).toBe(false);
      expect(isTimeInRanges(ranges, 70)).toBe(false);
      expect(isTimeInRanges(ranges, 74)).toBe(true);
    });

    it("should return true if the given time is inside one of the ranges", () => {
      const ranges = [ { start: 0, end: 1 },
                       { start: 30, end: 70 },
                       { start: 72, end: 74 },
                       { start: 74, end: Infinity } ];
      expect(isTimeInRanges(ranges, 0.5)).toBe(true);
      expect(isTimeInRanges(ranges, 34)).toBe(true);
      expect(isTimeInRanges(ranges, 9001)).toBe(true);
    });
    it("should return false if the given time is not inside one of the ranges", () => {
      const ranges = [ { start: 0, end: 1 },
                       { start: 30, end: 70 },
                       { start: 72, end: 74 },
                       { start: 74, end: Infinity } ];
      expect(isTimeInRanges(ranges, -4)).toBe(false);
      expect(isTimeInRanges(ranges, 2)).toBe(false);
      expect(isTimeInRanges(ranges, 70.1)).toBe(false);
    });
  });

  describe("removeEmptyRanges", () => {
    it("should do nothing on an empty array", () => {
      expect(removeEmptyRanges([])).toEqual([]);
    });
    it("should clear ranges which have their start equal to their end", () => {
      expect(removeEmptyRanges([
        { start: 30, end: 70 },
        { start: 90, end: 90 },
        { start: 100, end: 101 },
      ])).toEqual([
        { start: 30, end: 70 },
        { start: 100, end: 101 },
      ]);
      expect(removeEmptyRanges([
        { start: 30, end: 70 },
        { start: 90, end: 91 },
        { start: 100, end: 101 },
      ])).toEqual([
        { start: 30, end: 70 },
        { start: 90, end: 91 },
        { start: 100, end: 101 },
      ]);
    });
    it("should clear multiple sequential ranges", () => {
      expect(removeEmptyRanges([
        { start: 30, end: 70 },
        { start: 90, end: 90 },
        { start: 90, end: 90 },
        { start: 90, end: 90 },
        { start: 100, end: 101 },
      ])).toEqual([
        { start: 30, end: 70 },
        { start: 100, end: 101 },
      ]);
    });
    it("should clear the first and last ranges if they are empty", () => {
      expect(removeEmptyRanges([
        { start: 30, end: 30 },
        { start: 90, end: 91 },
        { start: 95, end: 96 },
        { start: 100, end: 100 },
      ])).toEqual([
        { start: 90, end: 91 },
        { start: 95, end: 96 },
      ]);
    });
    it("should return empty array if all ranges are empty", () => {
      expect(removeEmptyRanges([
        { start: 90, end: 90 },
        { start: 90, end: 90 },
        { start: 90, end: 90 },
      ])).toEqual([]);
    });
  });

  describe("mergeContiguousRanges", () => {
    it("should do nothing on an empty array", () => {
      expect(mergeContiguousRanges([])).toEqual([]);
    });

    it("should return ranges with merged contiguity", () => {
      expect(mergeContiguousRanges([
        { start: 30, end: 70 },
        { start: 70, end: 80 },
        { start: 90, end: 90 },
        { start: 100, end: 100 },
        { start: 100, end: 111 },
      ])).toEqual([
        { start: 30, end: 80 },
        { start: 90, end: 90 },
        { start: 100, end: 111 },
      ]);
    });

    it("should allow a small delta when calculating contiguity", () => {
      const delta = 1 / 60;
      expect(mergeContiguousRanges([
        { start: 30, end: 70 },
        { start: delta + 70, end: 80 },
        { start: 90, end: 90 },
        { start: 100, end: 100 },
        { start: delta * 2 + 100, end: 111 },
      ])).toEqual([
        { start: 30, end: 80 },
        { start: 90, end: 90 },
        { start: 100, end: 100 },
        { start: delta * 2 + 100, end: 111 },
      ]);
    });
  });

  describe("isAfter", () => {
    /* tslint:disable max-line-length */
    it("should return true if the first range begins after the end of the second range", () => {
    /* tslint:enable max-line-length */
      expect(isAfter(
        { start: 10, end: 15 },
        { start: 0, end: 5 }
      )).toBe(true);
    });

    /* tslint:disable max-line-length */
    it("should return true if the first range begins at the same time than the end of the second range", () => {
    /* tslint:enable max-line-length */
      expect(isAfter(
        { start: 5, end: 15 },
        { start: 0, end: 5 }
      )).toBe(true);
      expect(isAfter(
        { start: 70, end: 70 },
        { start: 10, end: 70 }
      )).toBe(true);
    });

    /* tslint:disable max-line-length */
    it("should return false if the first range begins before the end of the second range", () => {
    /* tslint:enable max-line-length */
      expect(isAfter(
        { start: 10.1, end: 10.2 },
        { start: 10, end: 70 }
      )).toBe(false);
      expect(isAfter(
        { start: 19, end: 50 },
        { start: 10, end: 20 }
      )).toBe(false);
      expect(isAfter(
        { start: 0, end: 5 },
        { start: 5, end: 15 }
      )).toBe(false);
    });
  });

  describe("isBefore", () => {
    /* tslint:disable max-line-length */
    it("should return true if the first range ends before the start of the second range", () => {
    /* tslint:enable max-line-length */
      expect(isBefore(
        { start: 0, end: 5 },
        { start: 10, end: 15 }
      )).toBe(true);
    });

    /* tslint:disable max-line-length */
    it("should return true if the first range ends at the same time than the start of the second range", () => {
    /* tslint:enable max-line-length */
      expect(isBefore(
        { start: 0, end: 5 },
        { start: 5, end: 15 }
      )).toBe(true);
      expect(isBefore(
        { start: 10, end: 70 },
        { start: 70, end: 70 }
      )).toBe(true);
    });

    /* tslint:disable max-line-length */
    it("should return false if the first range ends after the start of the second range", () => {
    /* tslint:enable max-line-length */
      expect(isBefore(
        { start: 10, end: 70 },
        { start: 10.1, end: 10.2 }
      )).toBe(false);
      expect(isBefore(
        { start: 10, end: 20 },
        { start: 19, end: 50 }
      )).toBe(false);
      expect(isBefore(
        { start: 5, end: 15 },
        { start: 0, end: 5 }
      )).toBe(false);
    });
  });

  describe("insertInto", () => {
    it("should do nothing if the given range is empty", () => {
      expect(insertInto([], { start: 10, end: 10 })).toEqual([]);
      expect(insertInto([
        { start: 0, end: 0 },
      ], { start: 10, end: 10 })).toEqual([
        { start: 0, end: 0 },
      ]);
      expect(insertInto([
        { start: 0, end: 9 },
      ], { start: 10, end: 10 })).toEqual([
        { start: 0, end: 9 },
      ]);
    });

    it("should just add the range if we had no original ranges", () => {
      expect(insertInto([], { start: 0, end: 5 })).toEqual([{ start: 0, end: 5 }]);
    });

    it("should not add a range contained entirely in a previous one", () => {
      expect(insertInto([
        { start: 0, end: 100 },
      ], { start: 10, end: 20 })).toEqual([
        { start: 0, end: 100 },
      ]);
      expect(insertInto([
        { start: 0, end: 100 },
        { start: 101, end: 201 },
      ], { start: 0, end: 100 })).toEqual([
        { start: 0, end: 100 },
        { start: 101, end: 201 },
      ]);
    });

    it("should merge a range contained partially in a previous one", () => {
      expect(insertInto([
        { start: 0, end: 100 },
      ], { start: 10, end: 110 })).toEqual([
        { start: 0, end: 110 },
      ]);
      expect(insertInto([
        { start: 0, end: 100 },
        { start: 101, end: 201 },
      ], { start: 90, end: 150 })).toEqual([
        { start: 0, end: 201 },
      ]);
    });

    it("should merge a range contiguous with a previous one", () => {
      expect(insertInto([
        { start: 0, end: 100 },
      ], { start: 100, end: 110 })).toEqual([
        { start: 0, end: 110 },
      ]);
      expect(insertInto([
        { start: 50, end: 70 },
      ], { start: 0, end: 50 })).toEqual([
        { start: 0, end: 70 },
      ]);
      expect(insertInto([
        { start: 0, end: 100 },
        { start: 101, end: 201 },
      ], { start: 100, end: 101 })).toEqual([
        { start: 0, end: 201 },
      ]);
    });

    it("should allow a small delta when calculating contiguity", () => {
      const delta = 1 / 60;
      expect(insertInto([
        { start: 0, end: 100 },
      ], { start: delta + 100, end: 110 })).toEqual([
        { start: 0, end: 110 },
      ]);
      expect(insertInto([
        { start: 0, end: 100 },
        { start: 101, end: 201 },
      ], { start: delta + 100, end: 101 - delta })).toEqual([
        { start: 0, end: 201 },
      ]);
    });

    it("should add a range strictly before what we already have", () => {
      expect(insertInto([
        { start: 50, end: 100 },
        { start: 101, end: 201 },
      ], { start: 0, end: 10 })).toEqual([
        { start: 0, end: 10 },
        { start: 50, end: 100 },
        { start: 101, end: 201 },
      ]);
    });

    it("should add a range strictly after what we already have", () => {
      expect(insertInto([
        { start: 50, end: 100 },
        { start: 101, end: 201 },
      ], { start: 500, end: 510 })).toEqual([
        { start: 50, end: 100 },
        { start: 101, end: 201 },
        { start: 500, end: 510 },
      ]);
    });

    it("should add a range between ranges we already have", () => {
      expect(insertInto([
        { start: 50, end: 100 },
        { start: 150, end: 200 },
      ], { start: 110, end: 120 })).toEqual([
        { start: 50, end: 100 },
        { start: 110, end: 120 },
        { start: 150, end: 200 },
      ]);
    });
  });
});
