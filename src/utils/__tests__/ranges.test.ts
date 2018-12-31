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

import { expect } from "chai";
import {
  convertToRanges,
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
      expect(ranges).to.deep.equal([
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
      expect(ranges).to.deep.equal([]);
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
      expect(getInnerAndOuterTimeRanges(timeRanges, 0)).to.deep
        .equal({
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
      expect(getInnerAndOuterTimeRanges(timeRanges, 9)).to.deep
        .equal({
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
      expect(getInnerAndOuterTimeRanges(timeRanges, 29)).to.deep
        .equal({
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
      expect(getInnerAndOuterTimeRanges(timeRanges, 10)).to.deep
        .equal({
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
      expect(getInnerAndOuterTimeRanges(timeRanges, 80)).to.deep
        .equal({
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
      expect(getInnerAndOuterTimeRanges(timeRanges, 20)).to.deep
        .equal({
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
      expect(getInnerAndOuterTimeRanges(timeRanges, 0)).to.deep
        .equal({
          outerRanges: [],
          innerRange: null,
        });
      expect(getInnerAndOuterTimeRanges(timeRanges, 0)).to.deep
        .equal({
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
      expect(getLeftSizeOfRange(timeRanges, 0)).to.equal(10 - 0);
      expect(getLeftSizeOfRange(timeRanges, 9.9)).to.equal(10 - 9.9);
      expect(getLeftSizeOfRange(timeRanges, 54.6)).to.equal(70 - 54.6);
    });

    it("should return Infinity if the given time is at the edge of a range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getLeftSizeOfRange(timeRanges, 10)).to.equal(Infinity);
      expect(getLeftSizeOfRange(timeRanges, 30)).to.equal(Infinity);
      expect(getLeftSizeOfRange(timeRanges, 70)).to.equal(Infinity);
    });

    it("should return Infinity if the given time is not in any range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getLeftSizeOfRange(timeRanges, 15)).to.equal(Infinity);
      expect(getLeftSizeOfRange(timeRanges, 38)).to.equal(Infinity);
      expect(getLeftSizeOfRange(timeRanges, -Infinity)).to.equal(Infinity);
      expect(getLeftSizeOfRange(timeRanges, Infinity)).to.equal(Infinity);
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
      expect(getNextRangeGap(timeRanges, 15.6)).to.equal(20 - 15.6);
      expect(getNextRangeGap(timeRanges, 30)).to.equal(50 - 30);
    });

    /* tslint:disable max-line-length */
    it("should return gap until next range if the given number is in a range", () => {
    /* tslint:enable max-line-length */
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getNextRangeGap(timeRanges, 0)).to.equal(20 - 0);
      expect(getNextRangeGap(timeRanges, 20.5)).to.equal(50 - 20.5);
    });

    it("should return Infinity when we are in the last time range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getNextRangeGap(timeRanges, 50)).to.equal(Infinity);
      expect(getNextRangeGap(timeRanges, 58.5)).to.equal(Infinity);
    });

    it("should return Infinity when we are after the last time range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getNextRangeGap(timeRanges, Infinity)).to.equal(Infinity);
      expect(getNextRangeGap(timeRanges, 70)).to.equal(Infinity);
    });
  });

  describe("getPlayedSizeOfRange", () => {
    it("should return the time before the current time in the current range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getPlayedSizeOfRange(timeRanges, 0)).to.equal(0 - 0);
      expect(getPlayedSizeOfRange(timeRanges, 9.9)).to.equal(9.9 - 0);
      expect(getPlayedSizeOfRange(timeRanges, 54.6)).to.equal(54.6 - 50);
    });

    it("should return 0 if the given time is at the edge of a range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getPlayedSizeOfRange(timeRanges, 10)).to.equal(0);
      expect(getPlayedSizeOfRange(timeRanges, 30)).to.equal(0);
      expect(getPlayedSizeOfRange(timeRanges, 70)).to.equal(0);
    });

    it("should return 0 if the given time is not in any range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getPlayedSizeOfRange(timeRanges, 15)).to.equal(0);
      expect(getPlayedSizeOfRange(timeRanges, 38)).to.equal(0);
      expect(getPlayedSizeOfRange(timeRanges, -Infinity)).to.equal(0);
      expect(getPlayedSizeOfRange(timeRanges, Infinity)).to.equal(0);
    });
  });

  describe("getRange", () => {
    it("should return the current range from the TimeRanges given", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getRange(timeRanges, 0)).to.deep.equal({
        start: 0,
        end: 10,
      });
      expect(getRange(timeRanges, 9.9)).to.deep.equal({
        start: 0,
        end: 10,
      });
      expect(getRange(timeRanges, 54.6)).to.deep.equal({
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
      expect(getRange(timeRanges, 10)).to.deep.equal(null);
      expect(getRange(timeRanges, 30)).to.deep.equal(null);
      expect(getRange(timeRanges, 70)).to.deep.equal(null);
    });

    it("should return null if the given time is not in any range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getRange(timeRanges, 15)).to.deep.equal(null);
      expect(getRange(timeRanges, 38)).to.deep.equal(null);
      expect(getRange(timeRanges, -Infinity)).to.deep.equal(null);
      expect(getRange(timeRanges, Infinity)).to.deep.equal(null);
    });
  });

  describe("getSizeOfRange", () => {
    it("should return the size of the current range from the TimeRanges given", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getSizeOfRange(timeRanges, 0)).to.equal(10);
      expect(getSizeOfRange(timeRanges, 9.9)).to.equal(10);
      expect(getSizeOfRange(timeRanges, 54.6)).to.equal(20);
    });

    it("should return 0 if the given time is at the edge of a range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getSizeOfRange(timeRanges, 10)).to.equal(0);
      expect(getSizeOfRange(timeRanges, 30)).to.equal(0);
      expect(getSizeOfRange(timeRanges, 70)).to.equal(0);
    });

    it("should return null if the given time is not in any range", () => {
      const timeRanges = constructTimeRanges([
        [0, 10],
        [20, 30],
        [50, 70],
      ]);
      expect(getSizeOfRange(timeRanges, 15)).to.equal(0);
      expect(getSizeOfRange(timeRanges, 38)).to.equal(0);
      expect(getSizeOfRange(timeRanges, -Infinity)).to.equal(0);
      expect(getSizeOfRange(timeRanges, Infinity)).to.equal(0);
    });
  });

  describe("keepRangeIntersection", () => {
    it("should return the same range if both given are equal", () => {
      const timeRanges = [
        { start: 0, end: 10 },
        { start: 20, end: 30 },
        { start: 50, end: 70 },
      ];
      expect(keepRangeIntersection(timeRanges, timeRanges)).to.deep.equal(timeRanges);
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
      expect(keepRangeIntersection(timeRanges1, timeRanges2)).to.deep.equal(timeRanges1);
      expect(keepRangeIntersection(timeRanges2, timeRanges1)).to.deep.equal(timeRanges1);
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
      expect(keepRangeIntersection(timeRanges1, timeRanges2)).to.deep.equal(result);
      expect(keepRangeIntersection(timeRanges2, timeRanges1)).to.deep.equal(result);
    });
  });

  describe("isTimeInRange", () => {
    it("should return true if the given time is equal to the start of the range", () => {
      expect(isTimeInRange({ start: 30, end: 70 }, 30)).to.equal(true);
      expect(isTimeInRange({ start: 72, end: Infinity }, 72)).to.equal(true);
      expect(isTimeInRange({ start: 0, end: 1 }, 0)).to.equal(true);
    });
    it("should return false if the given time is equal to the end of the range", () => {
      expect(isTimeInRange({ start: 30, end: 70 }, 70)).to.equal(false);
      expect(isTimeInRange({ start: 72, end: Infinity }, Infinity)).to.equal(false);
      expect(isTimeInRange({ start: 0, end: 1 }, 1)).to.equal(false);
    });
    it("should return true if the given time is inside the range", () => {
      expect(isTimeInRange({ start: 30, end: 70 }, 40)).to.equal(true);
      expect(isTimeInRange({ start: 72, end: Infinity }, 10000)).to.equal(true);
      expect(isTimeInRange({ start: 0, end: 1 }, 0.5)).to.equal(true);
    });
    it("should return false if the given time is not inside the range", () => {
      expect(isTimeInRange({ start: 30, end: 70 }, 20)).to.equal(false);
      expect(isTimeInRange({ start: 30, end: 70 }, 80)).to.equal(false);
      expect(isTimeInRange({ start: 72, end: Infinity }, 70)).to.equal(false);
      expect(isTimeInRange({ start: 0, end: 1 }, 7)).to.equal(false);
    });
  });

  describe("removeEmptyRanges", () => {
    it("should do nothing on an empty array", () => {
      expect(removeEmptyRanges([])).to.eql([]);
    });
    it("should clear ranges which have their start equal to their end", () => {
      expect(removeEmptyRanges([
        { start: 30, end: 70 },
        { start: 90, end: 90 },
        { start: 100, end: 101 },
      ])).to.eql([
        { start: 30, end: 70 },
        { start: 100, end: 101 },
      ]);
      expect(removeEmptyRanges([
        { start: 30, end: 70 },
        { start: 90, end: 91 },
        { start: 100, end: 101 },
      ])).to.eql([
        { start: 30, end: 70 },
        { start: 90, end: 91 },
        { start: 100, end: 101 },
      ]);
    });
  });

  describe("mergeContiguousRanges", () => {
    it("should do nothing on an empty array", () => {
      expect(mergeContiguousRanges([])).to.eql([]);
    });

    it("should return ranges with merged contiguity", () => {
      expect(mergeContiguousRanges([
        { start: 30, end: 70 },
        { start: 70, end: 80 },
        { start: 90, end: 90 },
        { start: 100, end: 100 },
        { start: 100, end: 111 },
      ])).to.eql([
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
      ])).to.eql([
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
      )).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return true if the first range begins at the same time than the end of the second range", () => {
    /* tslint:enable max-line-length */
      expect(isAfter(
        { start: 5, end: 15 },
        { start: 0, end: 5 }
      )).to.equal(true);
      expect(isAfter(
        { start: 70, end: 70 },
        { start: 10, end: 70 }
      )).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return false if the first range begins before the end of the second range", () => {
    /* tslint:enable max-line-length */
      expect(isAfter(
        { start: 10.1, end: 10.2 },
        { start: 10, end: 70 }
      )).to.equal(false);
      expect(isAfter(
        { start: 19, end: 50 },
        { start: 10, end: 20 }
      )).to.equal(false);
      expect(isAfter(
        { start: 0, end: 5 },
        { start: 5, end: 15 }
      )).to.equal(false);
    });
  });

  describe("isBefore", () => {
    /* tslint:disable max-line-length */
    it("should return true if the first range ends before the start of the second range", () => {
    /* tslint:enable max-line-length */
      expect(isBefore(
        { start: 0, end: 5 },
        { start: 10, end: 15 }
      )).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return true if the first range ends at the same time than the start of the second range", () => {
    /* tslint:enable max-line-length */
      expect(isBefore(
        { start: 0, end: 5 },
        { start: 5, end: 15 }
      )).to.equal(true);
      expect(isBefore(
        { start: 10, end: 70 },
        { start: 70, end: 70 }
      )).to.equal(true);
    });

    /* tslint:disable max-line-length */
    it("should return false if the first range ends after the start of the second range", () => {
    /* tslint:enable max-line-length */
      expect(isBefore(
        { start: 10, end: 70 },
        { start: 10.1, end: 10.2 }
      )).to.equal(false);
      expect(isBefore(
        { start: 10, end: 20 },
        { start: 19, end: 50 }
      )).to.equal(false);
      expect(isBefore(
        { start: 5, end: 15 },
        { start: 0, end: 5 }
      )).to.equal(false);
    });
  });

  describe("insertInto", () => {
    it("should do nothing if the given range is empty", () => {
      expect(insertInto([], { start: 10, end: 10 })).to.eql([]);
      expect(insertInto([
        { start: 0, end: 0 },
      ], { start: 10, end: 10 })).to.eql([
        { start: 0, end: 0 },
      ]);
      expect(insertInto([
        { start: 0, end: 9 },
      ], { start: 10, end: 10 })).to.eql([
        { start: 0, end: 9 },
      ]);
    });

    it("should just add the range if we had no original ranges", () => {
      expect(insertInto([], { start: 0, end: 5 })).to.eql([{ start: 0, end: 5 }]);
    });

    it("should not add a range contained entirely in a previous one", () => {
      expect(insertInto([
        { start: 0, end: 100 },
      ], { start: 10, end: 20 })).to.eql([
        { start: 0, end: 100 },
      ]);
      expect(insertInto([
        { start: 0, end: 100 },
        { start: 101, end: 201 },
      ], { start: 0, end: 100 })).to.eql([
        { start: 0, end: 100 },
        { start: 101, end: 201 },
      ]);
    });

    it("should merge a range contained partially in a previous one", () => {
      expect(insertInto([
        { start: 0, end: 100 },
      ], { start: 10, end: 110 })).to.eql([
        { start: 0, end: 110 },
      ]);
      expect(insertInto([
        { start: 0, end: 100 },
        { start: 101, end: 201 },
      ], { start: 90, end: 150 })).to.eql([
        { start: 0, end: 201 },
      ]);
    });

    it("should merge a range contiguous with a previous one", () => {
      expect(insertInto([
        { start: 0, end: 100 },
      ], { start: 100, end: 110 })).to.eql([
        { start: 0, end: 110 },
      ]);
      expect(insertInto([
        { start: 50, end: 70 },
      ], { start: 0, end: 50 })).to.eql([
        { start: 0, end: 70 },
      ]);
      expect(insertInto([
        { start: 0, end: 100 },
        { start: 101, end: 201 },
      ], { start: 100, end: 101 })).to.eql([
        { start: 0, end: 201 },
      ]);
    });

    it("should allow a small delta when calculating contiguity", () => {
      const delta = 1 / 60;
      expect(insertInto([
        { start: 0, end: 100 },
      ], { start: delta + 100, end: 110 })).to.eql([
        { start: 0, end: 110 },
      ]);
      expect(insertInto([
        { start: 0, end: 100 },
        { start: 101, end: 201 },
      ], { start: delta + 100, end: 101 - delta })).to.eql([
        { start: 0, end: 201 },
      ]);
    });

    it("should add a range strictly before what we already have", () => {
      expect(insertInto([
        { start: 50, end: 100 },
        { start: 101, end: 201 },
      ], { start: 0, end: 10 })).to.eql([
        { start: 0, end: 10 },
        { start: 50, end: 100 },
        { start: 101, end: 201 },
      ]);
    });

    it("should add a range strictly after what we already have", () => {
      expect(insertInto([
        { start: 50, end: 100 },
        { start: 101, end: 201 },
      ], { start: 500, end: 510 })).to.eql([
        { start: 50, end: 100 },
        { start: 101, end: 201 },
        { start: 500, end: 510 },
      ]);
    });

    it("should add a range between ranges we already have", () => {
      expect(insertInto([
        { start: 50, end: 100 },
        { start: 150, end: 200 },
      ], { start: 110, end: 120 })).to.eql([
        { start: 50, end: 100 },
        { start: 110, end: 120 },
        { start: 150, end: 200 },
      ]);
    });
  });
});
