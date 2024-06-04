import { describe, it, expect } from "vitest";
import type { IRepresentation } from "../../../../manifest";
import InitializationSegmentCache from "../initialization_segment_cache";

const representation1 = {
  bitrate: 12,
  id: "r1",
  getMimeTypeString(): string {
    return "";
  },
  isSupported: true,
  index: {},
  getProtectionsInitializationData(): [] {
    return [];
  },
  _addProtectionData(): never {
    throw new Error("Not implemented");
  },
} as unknown as IRepresentation;

const representation2 = {
  bitrate: 14,
  id: "r2",
  getMimeTypeString(): string {
    return "";
  },
  isSupported: true,
  index: {},
  getProtectionsInitializationData(): [] {
    return [];
  },
  _addProtectionData(): never {
    throw new Error("Not implemented");
  },
} as unknown as IRepresentation;

const initSegment1 = {
  id: "init1",
  isInit: true,
  url: "some.URLinit1",
  time: 0,
  end: 0,
  duration: 0,
  timescale: 1 as const,
  complete: true,
  privateInfos: {},
};

const initSegment2 = {
  id: "init2",
  isInit: true,
  url: "some.URLinit2",
  time: 0,
  end: 0,
  duration: 0,
  timescale: 1 as const,
  complete: true,
  privateInfos: {},
};

const initSegment3 = {
  id: "init3",
  isInit: true,
  url: "some.URLinit3",
  time: 0,
  end: 0,
  duration: 0,
  timescale: 1 as const,
  complete: true,
  privateInfos: {},
};

const segment1 = {
  id: "seg1",
  isInit: false,
  url: "some.URL1",
  time: 0,
  duration: 2,
  end: 2,
  timescale: 1 as const,
  complete: true,
  privateInfos: {},
};

const segment2 = {
  id: "seg2",
  isInit: false,
  url: "some.URL2",
  time: 2,
  duration: 2,
  end: 4,
  timescale: 1 as const,
  complete: true,
  privateInfos: {},
};

const segment3 = {
  id: "seg3",
  isInit: false,
  url: "some.URL3",
  time: 4,
  duration: 2,
  end: 6,
  timescale: 1 as const,
  complete: true,
  privateInfos: {},
};

const segment4 = {
  id: "seg4",
  isInit: false,
  url: "some.URL4",
  time: 6,
  duration: 2,
  end: 8,
  timescale: 1 as const,
  complete: true,
  privateInfos: {},
};

const data1 = new Uint8Array([0]);
const data2 = new Uint8Array([1]);
const data3 = new Uint8Array([2]);
const data4 = new Uint8Array([3]);

describe("utils - InitializationSegmentCache", () => {
  it("should return null when no item is in the cache", () => {
    const initializationSegmentCache = new InitializationSegmentCache<Uint8Array>();
    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: initSegment1,
      }),
    ).toBe(null);
    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: segment1,
      }),
    ).toBe(null);
  });

  it("should only cache the init segments", () => {
    const initializationSegmentCache = new InitializationSegmentCache<Uint8Array>();
    initializationSegmentCache.add(
      {
        representation: representation1,
        segment: segment1,
      },
      data1,
    );
    initializationSegmentCache.add(
      {
        representation: representation1,
        segment: initSegment1,
      },
      data2,
    );
    initializationSegmentCache.add(
      {
        representation: representation1,
        segment: segment2,
      },
      data3,
    );
    initializationSegmentCache.add(
      {
        representation: representation1,
        segment: segment3,
      },
      data4,
    );
    initializationSegmentCache.add(
      {
        representation: representation1,
        segment: segment4,
      },
      data1,
    );

    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: segment1,
      }),
    ).toBe(null);
    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: segment1,
      }),
    ).toBe(null);
    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: segment2,
      }),
    ).toBe(null);
    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: segment3,
      }),
    ).toBe(null);
    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: segment4,
      }),
    ).toBe(null);
    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: initSegment1,
      }),
    ).toBe(data2);
    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: initSegment2,
      }),
    ).toBe(data2); // Note: it doesn't care about the segment ID here
    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: initSegment3,
      }),
    ).toBe(data2); // Note: it doesn't care about the segment ID here

    initializationSegmentCache.add(
      {
        representation: representation2,
        segment: initSegment2,
      },
      data1,
    );

    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: initSegment2,
      }),
    ).toBe(data2);
    expect(
      initializationSegmentCache.get({
        representation: representation2,
        segment: initSegment1,
      }),
    ).toBe(data1);
    expect(
      initializationSegmentCache.get({
        representation: representation2,
        segment: initSegment2,
      }),
    ).toBe(data1);
  });

  it("should overwrite a previous init segment's data if a new one is set", () => {
    const initializationSegmentCache = new InitializationSegmentCache<Uint8Array>();
    initializationSegmentCache.add(
      {
        representation: representation1,
        segment: initSegment1,
      },
      data1,
    );
    initializationSegmentCache.add(
      {
        representation: representation1,
        segment: initSegment2,
      },
      data2,
    );
    initializationSegmentCache.add(
      {
        representation: representation1,
        segment: initSegment3,
      },
      data3,
    );

    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: initSegment1,
      }),
    ).toBe(data3);
    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: initSegment2,
      }),
    ).toBe(data3);
    expect(
      initializationSegmentCache.get({
        representation: representation1,
        segment: initSegment3,
      }),
    ).toBe(data3);
  });
});
