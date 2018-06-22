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

import parseOverlays from "../parse_overlays";

const element1 = {
  url: "url1",
  format: "format",
  xAxis: "xAxis",
  yAxis: "yAxis",
  height: "height",
  width: "width",
};
const element2 = {
  url: "url2",
  format: "format",
  xAxis: "xAxis",
  yAxis: "yAxis",
  height: "height",
  width: "width",
};
const element3 = {
  url: "url3",
  format: "format",
  xAxis: "xAxis",
  yAxis: "yAxis",
  height: "height",
  width: "width",
};
const element4 = {
  url: "url4",
  format: "format",
  xAxis: "xAxis",
  yAxis: "yAxis",
  height: "height",
  width: "width",
};
const element5 = {
  url: "url5",
  format: "format",
  xAxis: "xAxis",
  yAxis: "yAxis",
  height: "height",
  width: "width",
};
const overlays1 = [
  {
    start: 0,
    end: 200,
    timescale: 2,
    version: 1,
    elements: [element1],
  },
];

const overlays2 = [
  {
    start: 0,
    end: 200,
    timescale: 2,
    version: 1,
    elements: [element1],
  },
  {
    start: 10,
    end: 15,
    timescale: 1,
    version: 1,
    elements: [element2],
  },
];

const overlays3 = [
  {
    start: 0,
    end: 200,
    timescale: 2,
    elements: [element1],
    version: 1,
  },
  {
    start: 10,
    end: 15,
    timescale: 1,
    version: 1,
    elements: [element2],
  },
  {
    start: 11,
    end: 14,
    timescale: 1,
    version: 1,
    elements: [element3],
  },
  {
    start: 11,
    end: 14,
    timescale: 1,
    version: 1,
    elements: [element4],
  },
  {
    start: 12,
    end: 13,
    timescale: 1,
    version: 1,
    elements: [element5],
  },
];

const overlays4 = [
  {
    start: 0,
    end: 200,
    timescale: 2,
    version: 1,
    elements: [],
  },
];

const overlays5 = [
  {
    start: 0,
    end: 200,
    timescale: 2,
    elements: [element1],
    version: 1,
  },
  {
    start: 10,
    end: 15,
    timescale: 1,
    version: 1,
    elements: [element2],
  },
  {
    start: 15,
    end: 16,
    timescale: 1,
    version: 1,
    elements: [element3],
  },
  {
    start: 18,
    end: 104,
    timescale: 1,
    version: 1,
    elements: [element4],
  },
  {
    start: 102,
    end: 104,
    timescale: 1,
    version: 1,
    elements: [element1],
  },
  {
    start: 110,
    end: 150,
    timescale: 1,
    version: 1,
    elements: [element5],
  },
];

describe("parsers - overlays/metaplaylist - parsedOverlays", () => {
  it("should combine overlays by time groups", () => {
    expect(parseOverlays(overlays1)).toEqual([
      { start: 0, end: 100, elements: [element1] },
    ]);
    expect(parseOverlays(overlays2)).toEqual([
      { start: 0, end: 10, elements: [element1] },
      { start: 10, end: 15, elements: [element1, element2] },
      { start: 15, end: 100, elements: [element1] },
    ]);
    expect(parseOverlays(overlays3)).toEqual([
      { start: 0, end: 10, elements: [element1] },
      { start: 10, end: 11, elements: [element1, element2] },
      { start: 11, end: 12, elements: [element1, element2, element3, element4] },
      { start: 12, end: 13, elements: [
        element1, element2, element3, element4, element5,
      ] },
      { start: 13, end: 14, elements: [element1, element2, element3, element4] },
      { start: 14, end: 15, elements: [element1, element2] },
      { start: 15, end: 100, elements: [element1] },
    ]);
    expect(parseOverlays(overlays4)).toEqual([]);
    expect(parseOverlays(overlays5)).toEqual([
      { start: 0, end: 10, elements: [element1] },
      { start: 10, end: 15, elements: [element1, element2] },
      { start: 15, end: 16, elements: [element1, element3] },
      { start: 16, end: 18, elements: [element1] },
      { start: 18, end: 100, elements: [element1, element4] },
      { start: 100, end: 102, elements: [element4] },
      { start: 102, end: 104, elements: [element4, element1] },
      { start: 110, end: 150, elements: [element5] },
    ]);
  });
});
