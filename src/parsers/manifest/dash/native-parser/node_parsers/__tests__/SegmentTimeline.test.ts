import { describe, beforeEach, it, expect, vi } from "vitest";
import type SegmentTimelineParser from "../SegmentTimeline";

describe("DASH Node parsers - SegmentTimeline", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return a function to parse lazily the timeline", async () => {
    const parseSegmentTimeline = (await vi.importActual("../SegmentTimeline"))
      .default as typeof SegmentTimelineParser;

    const element = new DOMParser().parseFromString("<Root><S /></Root>", "text/xml")
      .childNodes[0] as Element;
    const mockGetElementsByTagName = vi.spyOn(element, "getElementsByTagName");
    const timeline = parseSegmentTimeline(element);
    expect(typeof timeline).toEqual("function");
    expect(timeline.length).toEqual(0);
    expect(mockGetElementsByTagName).not.toHaveBeenCalled();
    mockGetElementsByTagName.mockReset();
  });

  it("should return an empty HTMLCollection if no S element is present", async () => {
    const parseSegmentTimeline = (await vi.importActual("../SegmentTimeline"))
      .default as typeof SegmentTimelineParser;

    const element = new DOMParser().parseFromString("<Root />", "text/xml")
      .childNodes[0] as Element;
    const mockGetElementsByTagName = vi.spyOn(element, "getElementsByTagName");

    const timeline = parseSegmentTimeline(element);
    const res = timeline();
    expect(res).toBeInstanceOf(HTMLCollection);
    expect(res).toHaveLength(0);
    expect(mockGetElementsByTagName).toHaveBeenCalledTimes(1);
    expect(mockGetElementsByTagName).toHaveBeenCalledWith("S");
    mockGetElementsByTagName.mockReset();
  });

  it("should return an empty HTMLCollection for an Invalid XML", async () => {
    const parseSegmentTimeline = (await vi.importActual("../SegmentTimeline"))
      .default as typeof SegmentTimelineParser;

    const element = new DOMParser().parseFromString(
      "<Root><S></S><S<S></Root>",
      "text/xml",
    ).childNodes[0] as Element;
    const mockGetElementsByTagName = vi.spyOn(element, "getElementsByTagName");

    const timeline = parseSegmentTimeline(element);
    const res = timeline();
    expect(res).toBeInstanceOf(HTMLCollection);
    expect(res).toHaveLength(0);
    expect(mockGetElementsByTagName).toHaveBeenCalledTimes(1);
    expect(mockGetElementsByTagName).toHaveBeenCalledWith("S");
    mockGetElementsByTagName.mockReset();
  });

  it("should parse S elements only when called for the first time", async () => {
    const parseSegmentTimeline = (await vi.importActual("../SegmentTimeline"))
      .default as typeof SegmentTimelineParser;

    const sElement1 = new DOMParser().parseFromString("<S>1</S>", "text/xml")
      .childNodes[0] as Element;
    const sElement2 = new DOMParser().parseFromString("<S>2</S>", "text/xml")
      .childNodes[0] as Element;
    const aElement = new DOMParser().parseFromString("<A/>", "text/xml")
      .childNodes[0] as Element;
    const oElement = new DOMParser().parseFromString("<O/>", "text/xml")
      .childNodes[0] as Element;
    const element = new DOMParser().parseFromString(
      '<Root S="a"><![CDATA[ < > & ]]></Root>',
      "text/xml",
    ).childNodes[0] as Element;

    element.appendChild(sElement1);
    element.appendChild(aElement);
    element.appendChild(oElement);
    element.appendChild(sElement2);
    const mockGetElementsByTagName = vi.spyOn(element, "getElementsByTagName");

    const timeline = parseSegmentTimeline(element);
    const res1 = timeline();
    expect(res1).toBeInstanceOf(HTMLCollection);
    expect(res1).toHaveLength(2);
    expect(mockGetElementsByTagName).toHaveBeenCalledTimes(1);
    expect(mockGetElementsByTagName).toHaveBeenCalledWith("S");
    mockGetElementsByTagName.mockClear();
    const res2 = timeline();
    const res3 = timeline();
    expect(res2).toBe(res1);
    expect(res2).toBeInstanceOf(HTMLCollection);
    expect(res2).toHaveLength(2);
    expect(res3).toBe(res1);
    expect(res3).toBeInstanceOf(HTMLCollection);
    expect(res3).toHaveLength(2);
    expect(mockGetElementsByTagName).not.toHaveBeenCalled();
  });
});
