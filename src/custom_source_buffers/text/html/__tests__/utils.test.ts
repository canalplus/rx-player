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

import { IHTMLCue } from "../types";
import {
  areNearlyEqual,
  getCuesAfter,
  getCuesBefore,
  removeCuesInfosBetween,
} from "../utils";

describe("HTML Text buffer utils - getCuesBefore", () => {
  it("should get the right cues when time is the start of a cue", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 0, end: 1, element },
      { start: 1, end: 2, element },
      { start: 2, end: 3, element },
    ];

    expect(getCuesBefore(cues, 1)).toEqual([
      { start: 0, end: 1, element },
    ]);
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

    expect(getCuesAfter(cues, 3)).toEqual([
      { start: 3, end: 4, element },
    ]);
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

    expect(getCuesAfter(cues, 3.5)).toEqual([
      { start: 4, end: 5, element },
    ]);
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
});

describe("HTML Text buffer utils - removeCuesInfosBetween", () => {
  it("should remove cues infos between end of a cue and start of another cue", () => {
    const element = document.createElement("div");
    const cues = [ { start: 1, end: 2, element },
                   { start: 2, end: 3, element },
                   { start: 3, end: 4, element },
                   { start: 4, end: 5, element },
                   { start: 5, end: 6, element } ];

    const cueInfo = { start: 1,
                      end: 6,
                      cues };

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

    const cueInfo = { start: 1,
                      end: 6,
                      cues };

    expect(removeCuesInfosBetween(cueInfo, 2.5, 4.5)).toEqual([
      { cues: [ { start: 1, end: 2, element },
                { start: 2, end: 3, element } ],
              start: 1,
              end: 2.5 },
      { cues: [ { start: 4, end: 5, element },
                { start: 5, end: 6, element } ],
              start: 4.5,
              end: 6 },
    ]);
  });

  it("should remove cues infos between two cue gaps", () => {
    const element = document.createElement("div");
    const cues = [
      { start: 1, end: 2, element },
      { start: 3, end: 4, element },
      { start: 5, end: 6, element },
    ];

    const cueInfo = { start: 1,
                      end: 6,
                      cues };

    expect(removeCuesInfosBetween(cueInfo, 2.5, 4.5)).toEqual([
      { cues: [{ start: 1, end: 2, element }], start: 1, end: 2.5 },
      { cues: [{ start: 5, end: 6, element }], start: 4.5, end: 6 },
    ]);
  });
});
