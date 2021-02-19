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

import InitializationSegmentCache from "../initialization_segment_cache";

const representation1 = {
  bitrate: 12,
  id: "r1",
  getMimeTypeString() : string { return ""; },
  isSupported: true,
  index: {
    getInitSegment() : null { return null; },
    getSegments() : never { throw new Error("Not implemented"); },
    shouldRefresh() : boolean { return false; },
    getFirstPosition() : undefined { return ; },
    getLastPosition() : undefined { return ; },
    checkDiscontinuity() : number | null { return null; },
    areSegmentsChronologicallyGenerated() : boolean { return true; },
    isSegmentStillAvailable() : undefined { return ; },
    canBeOutOfSyncError() : true { return true; },
    isFinished() : true { return true; },
    isInitialized() : true { return true; },
    _replace() : never { throw new Error("Not implemented"); },
    _update() : never { throw new Error("Not implemented"); },
  },
  getProtectionsInitializationData() : [] { return []; },
  _addProtectionData() : never { throw new Error("Not implemented"); },
};

const representation2 = {
  bitrate: 14,
  id: "r2",
  getMimeTypeString() : string { return ""; },
  isSupported: true,
  index: {
    getInitSegment() : null { return null; },
    getSegments() : never { throw new Error("Not implemented"); },
    shouldRefresh() : boolean { return false; },
    getFirstPosition() : undefined { return ; },
    getLastPosition() : undefined { return ; },
    checkDiscontinuity() : number | null { return null; },
    areSegmentsChronologicallyGenerated() : boolean { return true; },
    isSegmentStillAvailable() : undefined { return ; },
    canBeOutOfSyncError() : false { return false; },
    isFinished() : true { return true; },
    isInitialized() : true { return true; },
    _replace() : never { throw new Error("Not implemented"); },
    _update() : never { throw new Error("Not implemented"); },
  },
  getProtectionsInitializationData() : [] { return []; },
  _addProtectionData() : never { throw new Error("Not implemented"); },
};

const initSegment1 = {
  id: "init1",
  isInit: true,
  time: 0,
  end: 0,
  duration: 0,
  timescale: 1 as const,
  mediaURLs: ["http://www.example.com/some.URLinit1"],
};

const initSegment2 = {
  id: "init2",
  isInit: true,
  time: 0,
  end: 0,
  duration: 0,
  timescale: 1 as const,
  mediaURLs: ["http://www.example.com/some.URLinit2"],
};

const initSegment3 = {
  id: "init3",
  isInit: true,
  time: 0,
  end: 0,
  duration: 0,
  timescale: 1 as const,
  mediaURLs: ["http://www.example.com/some.URLinit3"],
};

const segment1 = {
  id: "seg1",
  isInit: false,
  time: 0,
  duration: 2,
  end: 2,
  timescale: 1 as const,
  mediaURLs: ["http://www.example.com/some.URL2"],
};

const segment2 = {
  id: "seg2",
  isInit: false,
  time: 2,
  duration: 2,
  end: 4,
  timescale: 1 as const,
  mediaURLs: ["http://www.example.com/some.URL2"],
};

const segment3 = {
  id: "seg3",
  isInit: false,
  time: 4,
  duration: 2,
  end: 6,
  timescale: 1 as const,
  mediaURLs: ["http://www.example.com/some.URL3"],
};

const segment4 = {
  id: "seg4",
  isInit: false,
  time: 6,
  duration: 2,
  end: 8,
  timescale: 1 as const,
  mediaURLs: ["http://www.example.com/some.URL4"],
};

const data1 = new Uint8Array([0]);
const data2 = new Uint8Array([1]);
const data3 = new Uint8Array([2]);
const data4 = new Uint8Array([3]);

describe("utils - InitializationSegmentCache", () => {
  it("should return null when no item is in the cache", () => {
    const initializationSegmentCache = new InitializationSegmentCache<Uint8Array>();
    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: initSegment1,
    })).toBe(null);
    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: segment1,
    })).toBe(null);
  });

  it("should only cache the init segments", () => {
    const initializationSegmentCache = new InitializationSegmentCache<Uint8Array>();
    initializationSegmentCache.add({
      representation: representation1,
      segment: segment1,
    }, data1);
    initializationSegmentCache.add({
      representation: representation1,
      segment: initSegment1,
    }, data2);
    initializationSegmentCache.add({
      representation: representation1,
      segment: segment2,
    }, data3);
    initializationSegmentCache.add({
      representation: representation1,
      segment: segment3,
    }, data4);
    initializationSegmentCache.add({
      representation: representation1,
      segment: segment4,
    }, data1);

    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: segment1,
    })).toBe(null);
    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: segment1,
    })).toBe(null);
    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: segment2,
    })).toBe(null);
    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: segment3,
    })).toBe(null);
    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: segment4,
    })).toBe(null);
    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: initSegment1,
    })).toBe(data2);
    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: initSegment2,
    })).toBe(data2); // Note: it doesn't care about the segment ID here
    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: initSegment3,
    })).toBe(data2); // Note: it doesn't care about the segment ID here

    initializationSegmentCache.add({
      representation: representation2,
      segment: initSegment2,
    }, data1);

    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: initSegment2,
    })).toBe(data2);
    expect(initializationSegmentCache.get({
      representation: representation2,
      segment: initSegment1,
    })).toBe(data1);
    expect(initializationSegmentCache.get({
      representation: representation2,
      segment: initSegment2,
    })).toBe(data1);
  });

  it("should overwrite a previous init segment's data if a new one is set", () => {
    const initializationSegmentCache = new InitializationSegmentCache<Uint8Array>();
    initializationSegmentCache.add({
      representation: representation1,
      segment: initSegment1,
    }, data1);
    initializationSegmentCache.add({
      representation: representation1,
      segment: initSegment2,
    }, data2);
    initializationSegmentCache.add({
      representation: representation1,
      segment: initSegment3,
    }, data3);

    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: initSegment1,
    })).toBe(data3);
    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: initSegment2,
    })).toBe(data3);
    expect(initializationSegmentCache.get({
      representation: representation1,
      segment: initSegment3,
    })).toBe(data3);
  });
});
