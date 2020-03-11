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

/* tslint:disable no-unsafe-any */
describe("DASH Node parsers - SegmentTimeline", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return a function to parse lazily the timeline", () => {
    const parseS = jest.fn();
    jest.mock("../S", () => ({
      __esModule: true,
      default: parseS,
    }));
    const parseSegmentTimeline = require("../SegmentTimeline").default;

    const element = new DOMParser()
      .parseFromString("<Root S=\"a\"/>", "text/xml")
      .childNodes[0] as Element;
    const timeline = parseSegmentTimeline(element);
    expect(typeof timeline).toEqual("function");
    expect(timeline.length).toEqual(0);
  });

  it("should do nothing if no childNode is present", () => {
    const parseS = jest.fn();
    jest.mock("../S", () => ({
      __esModule: true,
      default: parseS,
    }));
    const parseSegmentTimeline = require("../SegmentTimeline").default;

    const element = new DOMParser()
      .parseFromString("<Root S=\"a\"/>", "text/xml")
      .childNodes[0] as Element;

    const timeline = parseSegmentTimeline(element);
    expect(timeline()).toEqual([]);
    expect(parseS).not.toHaveBeenCalled();
  });

  it("should do nothing with childNodes if no S is present", () => {
    const parseS = jest.fn();
    jest.mock("../S", () => ({
      __esModule: true,
      default: parseS,
    }));
    const parseSegmentTimeline = require("../SegmentTimeline").default;

    const aElement = new DOMParser()
      .parseFromString("<A/>", "text/xml")
      .childNodes[0] as Element;
    const oElement = new DOMParser()
      .parseFromString("<O/>", "text/xml")
      .childNodes[0] as Element;
    const element = new DOMParser()
      .parseFromString("<Root S=\"a\"/>", "text/xml")
      .childNodes[0] as Element;

    element.appendChild(aElement);
    element.appendChild(oElement);

    const timeline = parseSegmentTimeline(element);
    expect(timeline()).toEqual([]);
    expect(parseS).not.toHaveBeenCalled();
  });

  it("should parse S elements only when called for the first time", () => {
    const parseS = jest.fn((s) => ({ start: +s.innerHTML }));
    jest.mock("../S", () => ({
      __esModule: true,
      default: parseS,
    }));
    const parseSegmentTimeline = require("../SegmentTimeline").default;

    const sElement1 = new DOMParser()
      .parseFromString("<S>1</S>", "text/xml")
      .childNodes[0] as Element;
    const sElement2 = new DOMParser()
      .parseFromString("<S>2</S>", "text/xml")
      .childNodes[0] as Element;
    const aElement = new DOMParser()
      .parseFromString("<A/>", "text/xml")
      .childNodes[0] as Element;
    const oElement = new DOMParser()
      .parseFromString("<O/>", "text/xml")
      .childNodes[0] as Element;
    const element = new DOMParser()
      .parseFromString("<Root S=\"a\"><![CDATA[ < > & ]]></Root>", "text/xml")
      .childNodes[0] as Element;

    element.appendChild(sElement1);
    element.appendChild(aElement);
    element.appendChild(oElement);
    element.appendChild(sElement2);

    const timeline = parseSegmentTimeline(element);
    expect(parseS).toHaveBeenCalledTimes(0);
    expect(timeline()).toEqual([{ start: 1 }, { start: 2 }]);
    expect(parseS).toHaveBeenCalledTimes(2);
    expect(parseS).toHaveBeenCalledWith(sElement1);
    expect(parseS).toHaveBeenCalledWith(sElement2);
    timeline();
    expect(parseS).toHaveBeenCalledTimes(2);
    timeline();
    expect(parseS).toHaveBeenCalledTimes(2);
  });
});
/* tslint:enable no-unsafe-any */
