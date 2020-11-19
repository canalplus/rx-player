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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("DASH Node parsers - SegmentTimeline", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return a function to parse lazily the timeline", () => {
    const parseSegmentTimeline = require("../SegmentTimeline").default;

    const element = new DOMParser()
      .parseFromString("<Root><S /></Root>", "text/xml")
      .childNodes[0] as Element;
    const getElementsByTagNameSpy = jest.spyOn(element, "getElementsByTagName");
    const timeline = parseSegmentTimeline(element);
    expect(typeof timeline).toEqual("function");
    expect(timeline.length).toEqual(0);
    expect(getElementsByTagNameSpy).not.toHaveBeenCalled();
    getElementsByTagNameSpy.mockReset();
  });

  it("should return an empty HTMLCollection if no S element is present", () => {
    const parseSegmentTimeline = require("../SegmentTimeline").default;

    const element = new DOMParser()
      .parseFromString("<Root />", "text/xml")
      .childNodes[0] as Element;
    const getElementsByTagNameSpy = jest.spyOn(element, "getElementsByTagName");

    const timeline = parseSegmentTimeline(element);
    const res = timeline();
    expect(res).toBeInstanceOf(HTMLCollection);
    expect(res).toHaveLength(0);
    expect(getElementsByTagNameSpy).toHaveBeenCalledTimes(1);
    expect(getElementsByTagNameSpy).toHaveBeenCalledWith("S");
    getElementsByTagNameSpy.mockReset();
  });

  it("should return an empty HTMLCollection for an Invalid XML", () => {
    const parseSegmentTimeline = require("../SegmentTimeline").default;

    const element = new DOMParser()
      .parseFromString("<Root><S></S><S<S></Root>", "text/xml")
      .childNodes[0] as Element;
    const getElementsByTagNameSpy = jest.spyOn(element, "getElementsByTagName");

    const timeline = parseSegmentTimeline(element);
    const res = timeline();
    expect(res).toBeInstanceOf(HTMLCollection);
    expect(res).toHaveLength(0);
    expect(getElementsByTagNameSpy).toHaveBeenCalledTimes(1);
    expect(getElementsByTagNameSpy).toHaveBeenCalledWith("S");
    getElementsByTagNameSpy.mockReset();
  });

  it("should parse S elements only when called for the first time", () => {
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
    const getElementsByTagNameSpy = jest.spyOn(element, "getElementsByTagName");

    const timeline = parseSegmentTimeline(element);
    const res1 = timeline();
    expect(res1).toBeInstanceOf(HTMLCollection);
    expect(res1).toHaveLength(2);
    expect(getElementsByTagNameSpy).toHaveBeenCalledTimes(1);
    expect(getElementsByTagNameSpy).toHaveBeenCalledWith("S");
    getElementsByTagNameSpy.mockClear();
    const res2 = timeline();
    const res3 = timeline();
    expect(res2).toBe(res1);
    expect(res2).toBeInstanceOf(HTMLCollection);
    expect(res2).toHaveLength(2);
    expect(res3).toBe(res1);
    expect(res3).toBeInstanceOf(HTMLCollection);
    expect(res3).toHaveLength(2);
    expect(getElementsByTagNameSpy).not.toHaveBeenCalled();
  });
});
