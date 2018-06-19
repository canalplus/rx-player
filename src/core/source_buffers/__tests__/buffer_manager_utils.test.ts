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
  areNearlyEqual,
  getDataAfter,
  getDataBefore,
  removeDataInfosBetween,
} from "../buffer_manager_utils";
import { ITimedData } from "../types";

describe("Buffer Manager utils - getDataBefore", () => {
  it("should get the right content when time is the start of one", () => {
    const data = document.createElement("div");
    const content = [
      { start: 0, end: 1, data },
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
    ];

    expect(getDataBefore(content, 1)).toEqual([
      { start: 0, end: 1, data },
    ]);
  });

  it("should get the right content when time is between start and end of one", () => {
    const data = document.createElement("div");
    const content = [
      { start: 0, end: 1, data },
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
    ];

    expect(getDataBefore(content, 1.5)).toEqual([
      { start: 0, end: 1, data },
    ]);
  });

  it("should get the right content when time is the end of one", () => {
    const data = document.createElement("div");
    const content = [
      { start: 0, end: 1, data },
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
    ];

    expect(getDataBefore(content, 2)).toEqual([
      { start: 0, end: 1, data },
      { start: 1, end: 2, data },
    ]);
  });

  it("should get the right content when time is between two contents", () => {
    const data = document.createElement("div");
    const content = [
      { start: 0, end: 1, data },
      { start: 1, end: 2, data },
      { start: 3, end: 4, data },
    ];

    expect(getDataBefore(content, 2.5)).toEqual([
      { start: 0, end: 1, data },
      { start: 1, end: 2, data },
    ]);
  });

  it("should return empty array when time is before all contents", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ];

    expect(getDataBefore(content, 0)).toEqual([]);
  });

  it("should return empty array when time is the start of all contents", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ];

    expect(getDataBefore(content, 1)).toEqual([]);
  });

  it("should get the right content when time is after all contents", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ];

    expect(getDataBefore(content, 4.5)).toEqual([
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ]);
  });

  it("should get the right content when time is the end of all contents", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ];

    expect(getDataBefore(content, 4)).toEqual([
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ]);
  });

  it("should return empty array if no content was given", () => {
    expect(getDataBefore([], 3945)).toEqual([]);
  });
});

describe("Buffer Manager utils - getDataAfter", () => {
  it("should get the right content when time is between start and end of one", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ];

    expect(getDataAfter(content, 2.5)).toEqual([
      { start: 3, end: 4, data },
    ]);
  });

  it("should get the right content when time is the start of one", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ];

    expect(getDataAfter(content, 2)).toEqual([
      { start: 3, end: 4, data },
    ]);
  });

  it("should return an empty array when time is the start of the last content", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ];

    expect(getDataAfter(content, 3)).toEqual([]);
  });

  it("should get the right content when time is before the start of all contents", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ];

    expect(getDataAfter(content, 0)).toEqual([
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ]);
  });

  it("should get the right content when time is the start of the first content", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ];

    expect(getDataAfter(content, 1)).toEqual([
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ]);
  });

  it("should return an empty array when time is the end of the last content", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ];

    expect(getDataAfter(content, 4)).toEqual([]);
  });

  it("should return an empty array when time is after the end of all contents", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
    ];

    expect(getDataAfter(content, 5)).toEqual([]);
  });

  it("should get the right content when time is between two contents", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 4, end: 5, data },
    ];

    expect(getDataAfter(content, 3.5)).toEqual([
      { start: 4, end: 5, data },
    ]);
  });

  it("should return an empty array when no content is given", () => {
    expect(getDataAfter([], 1418)).toEqual([]);
  });
});

describe("Buffer Manager utils - areNearlyEqual", () => {
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

describe("Buffer Manager utils - removeDataInfosBetween", () => {
  /* tslint:disable max-line-length */
  it("should remove content infos between end of an element and start of another one", () => {
  /* tslint:enable max-line-length */
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
      { start: 4, end: 5, data },
      { start: 5, end: 6, data },
    ];

    const cueInfo = {
      start: 1,
      end: 6,
      content,
    };

    expect(removeDataInfosBetween(cueInfo, 2, 5)).toEqual([
      { content: [{ start: 1, end: 2, data }], start: 1, end: 2 },
      { content: [], start: 5, end: 6 },
    ]);
  });

  /* tslint:disable max-line-length */
  it("should remove content infos between middle of an element and middle of another one", () => {
  /* tslint:enable max-line-length */
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 2, end: 3, data },
      { start: 3, end: 4, data },
      { start: 4, end: 5, data },
      { start: 5, end: 6, data },
    ];

    const cueInfo = {
      start: 1,
      end: 6,
      content,
    };

    expect(removeDataInfosBetween(cueInfo, 2.5, 4.5)).toEqual([
      { content: [{ start: 1, end: 2, data }], start: 1, end: 2.5 },
      { content: [{ start: 5, end: 6, data }], start: 4.5, end: 6 },
    ]);
  });

  it("should remove content infos between two element gaps", () => {
    const data = document.createElement("div");
    const content = [
      { start: 1, end: 2, data },
      { start: 3, end: 4, data },
      { start: 5, end: 6, data },
    ];

    const cueInfo = {
      start: 1,
      end: 6,
      content,
    };

    expect(removeDataInfosBetween(cueInfo, 2.5, 4.5)).toEqual([
      { content: [{ start: 1, end: 2, data }], start: 1, end: 2.5 },
      { content: [{ start: 5, end: 6, data }], start: 4.5, end: 6 },
    ]);
  });
});
