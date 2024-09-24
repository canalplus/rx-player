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

import type { IHTMLCue } from "../types";
import {
  areNearlyEqual,
  getCuesAfter,
  getCuesBefore,
  removeCuesInfosBetween,
  areCuesStartNearlyEqual,
} from "../utils";

describe("HTML Text buffer utils - getCuesBefore", () => {
  it("should get the right cues when time is the start of a cue", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 0, end: 1, element },
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
    ];

    expect(getCuesBefore(cues, 1)).toEqual([{ start: 0, end: 1, element }]);
  });

  it("should get the right cues when time is between start and end of a cue", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 0, end: 1, element },
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
    ];

    expect(getCuesBefore(cues, 1.5)).toEqual([
      { start: 0, end: 1, element },
      { start: 1, end: 2, element },
    ]);
  });

  it("should get the right cues when time is the end of a cue", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 0, end: 1, element },
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
    ];

    expect(getCuesBefore(cues, 2)).toEqual([
      { start: 0, end: 1, element },
      { start: 1, end: 2, element },
    ]);
  });

  it("should get the right cues when time is between two cues", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 0, end: 1, element },
      { start: 1, end: 2, element },
      { start: 3, end: 4, element },
    ];

    expect(getCuesBefore(cues, 2.5)).toEqual([
      { start: 0, end: 1, element },
      { start: 1, end: 2, element },
    ]);
  });

  it("should return empty array when time is before all cues", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ];

    expect(getCuesBefore(cues, 0)).toEqual([]);
  });

  it("should return empty array when time is the start of all cues", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ];

    expect(getCuesBefore(cues, 1)).toEqual([]);
  });

  it("should get the right cues when time is after all cues", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ];

    expect(getCuesBefore(cues, 4.5)).toEqual([
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ]);
  });

  it("should get the right cues when time is the end of all cues", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ];

    expect(getCuesBefore(cues, 4)).toEqual([
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ]);
  });

  it("should return empty array if no given cues", () => {
    const cues: IHTMLCue[] = [];
    expect(getCuesBefore(cues, 3945)).toEqual([]);
  });
});

describe("HTML Text buffer utils - getCuesAfter", () => {
  it("should get the right cues when time is between start and end of a cue", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ];

    expect(getCuesAfter(cues, 2.5)).toEqual([
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ]);
  });

  it("should get the right cues when time is a cue start", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ];

    expect(getCuesAfter(cues, 2)).toEqual([
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ]);
  });

  it("should return an empty arraywhen time is a cue end", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ];

    expect(getCuesAfter(cues, 3)).toEqual([{ start: 3, end: 4, element }]);
  });

  it("should get the right cues when time is before the start of all cues", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ];

    expect(getCuesAfter(cues, 0)).toEqual([
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ]);
  });

  it("should get the right cues when time is the start of all cues", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ];

    expect(getCuesAfter(cues, 1)).toEqual([
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ]);
  });

  it("should return an empty array when time is the end of all cues", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ];

    expect(getCuesAfter(cues, 4)).toEqual([]);
  });

  it("should return an empty array when time is after the end of all cues", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
    ];

    expect(getCuesAfter(cues, 5)).toEqual([]);
  });

  it("should get the right cues when time is between two cues", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 4, end: 5, element },
    ];

    expect(getCuesAfter(cues, 3.5)).toEqual([{ start: 4, end: 5, element }]);
  });

  it("should return an empty array when no cues are given", () => {
    const cues: IHTMLCue[] = [];
    expect(getCuesAfter(cues, 1418)).toEqual([]);
  });
});

describe("HTML Text buffer utils - areNearlyEqual", () => {
  it("should return false if input number are not nearly equals", () => {
    expect(areNearlyEqual(5, 6)).toBe(false);
  });

  it("should return true if input number are nearly equals", () => {
    expect(areNearlyEqual(5, 5.1)).toBe(true);
  });

  it("should return true if input number are equals", () => {
    expect(areNearlyEqual(5, 5)).toBe(true);
  });
  it("should return false if input number are not nearly equals with delta parameter", () => {
    expect(areNearlyEqual(5, 5.1, 0.02)).toBe(false);
  });
  it("should return true if input number are nearly equals with delta parameter", () => {
    expect(areNearlyEqual(5, 5.01, 0.02)).toBe(true);
  });
  it("should return true if input number are equals with delta parameter", () => {
    expect(areNearlyEqual(5, 5, 0.02)).toBe(true);
  });
});

describe("HTML Text buffer utils - removeCuesInfosBetween", () => {
  it("should remove cues infos between end of a cue and start of another cue", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
      { start: 4, end: 5, element },
      { start: 5, end: 6, element },
    ];

    const cueInfo = { start: 1, end: 6, cues };

    expect(removeCuesInfosBetween(cueInfo, 2, 5)).toEqual([
      { cues: [{ start: 1, end: 2, element }], start: 1, end: 2 },
      { cues: [{ start: 5, end: 6, element }], start: 5, end: 6 },
    ]);
  });

  it("should remove cues infos between middle of a cue and middle of another cue", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
      { start: 3, end: 4, element },
      { start: 4, end: 5, element },
      { start: 5, end: 6, element },
    ];

    const cueInfo = { start: 1, end: 6, cues };

    expect(removeCuesInfosBetween(cueInfo, 2.5, 4.5)).toEqual([
      {
        cues: [
          { start: 1, end: 2, element },
          { start: 2, end: 3, element },
        ],
        start: 1,
        end: 2.5,
      },
      {
        cues: [
          { start: 4, end: 5, element },
          { start: 5, end: 6, element },
        ],
        start: 4.5,
        end: 6,
      },
    ]);
  });

  it("should remove cues infos between two cue gaps", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 3, end: 4, element },
      { start: 5, end: 6, element },
    ];

    const cueInfo = { start: 1, end: 6, cues };

    expect(removeCuesInfosBetween(cueInfo, 2.5, 4.5)).toEqual([
      { cues: [{ start: 1, end: 2, element }], start: 1, end: 2.5 },
      { cues: [{ start: 5, end: 6, element }], start: 4.5, end: 6 },
    ]);
  });
});

describe("HTML areCuesStartNearlyEqual", () => {
  it("Case 1: should be false", () => {
    // * [0, 2] and [2, 4] start are NOT equals
    const element = document.createElement("div");
    const cues = [{ start: 1, end: 2, element }];
    const cueInfo1 = { start: 0, end: 2, cues };
    const cueInfo2 = { start: 2, end: 4, cues };

    expect(areCuesStartNearlyEqual(cueInfo1, cueInfo2)).toBe(false);
  });
  it("Case 2: should be true", () => {
    // * [0, 2] and [0, 4]  start are equals
    const element = document.createElement("div");
    const cues = [{ start: 1, end: 2, element }];
    const cueInfo1 = { start: 0, end: 2, cues };
    const cueInfo2 = { start: 0, end: 4, cues };
    expect(areCuesStartNearlyEqual(cueInfo1, cueInfo2)).toBe(true);
  });

  it("Case 3: should be false", () => {
    // * [0, 0.1] and [0.101, 2] start are NOT equals
    const element = document.createElement("div");
    const cues = [{ start: 1, end: 2, element }];
    const cueInfo1 = { start: 0, end: 0.1, cues };
    const cueInfo2 = { start: 0.101, end: 2, cues };
    expect(areCuesStartNearlyEqual(cueInfo1, cueInfo2)).toBe(false);
  });

  it("Case 4: should be true", () => {
    // * [0, 2] and [0.01, 4]  start are equals
    const element = document.createElement("div");
    const cues = [{ start: 1, end: 2, element }];
    const cueInfo1 = { start: 0, end: 2, cues };
    const cueInfo2 = { start: 0.01, end: 4, cues };
    expect(areCuesStartNearlyEqual(cueInfo1, cueInfo2)).toBe(true);
  });

  it("Case 5: should be false", () => {
    // * [0, 100] and [1, 200]  start are NOT equals
    const element = document.createElement("div");
    const cues = [{ start: 1, end: 2, element }];
    const cueInfo1 = { start: 0, end: 100, cues };
    const cueInfo2 = { start: 2, end: 200, cues };
    expect(areCuesStartNearlyEqual(cueInfo1, cueInfo2)).toBe(false);
  });

  it("Case 6: should be true", () => {
    // * [0, 4] and [0.01, 3.99]  start should be equals
    const element = document.createElement("div");
    const cues = [{ start: 0, end: 4, element }];
    const cueInfo1 = { start: 0, end: 4, cues };
    const cueInfo2 = { start: 0.01, end: 3.99, cues };
    expect(areCuesStartNearlyEqual(cueInfo1, cueInfo2)).toBe(true);
  });
});
