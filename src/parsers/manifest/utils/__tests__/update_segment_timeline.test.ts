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

import { IIndexSegment } from "../index_helpers";

describe("Manifest Parsers utils - updateSegmentTimeline", () => {
  let logWarnSpy : jest.MockInstance<void, unknown[]> | undefined;
  let updateSegmentTimeline : ((a : IIndexSegment[],
                                b : IIndexSegment[]) => void) | undefined;
  beforeEach(() => {
    jest.resetModules();

    logWarnSpy = jest.spyOn(require("../../../../log").default, "warn");
    updateSegmentTimeline = require("../update_segment_timeline").default;
  });

  afterEach(() => {
    logWarnSpy?.mockRestore();
  });

  /* eslint-disable max-len */
  it("should just replace with the new timeline if the old was empty", () => {
  /* eslint-enable max-len */
    const oldTimeline : IIndexSegment[] = [];
    const newTimeline1 = [{ start: 0, duration: 1000, repeatCount: 10 }];
    const newTimeline2 : IIndexSegment[] = [];
    updateSegmentTimeline?.(oldTimeline, newTimeline1);
    expect(oldTimeline).toEqual(newTimeline1);

    oldTimeline.length = 0; // reset
    updateSegmentTimeline?.(oldTimeline, newTimeline2);
    expect(oldTimeline).toEqual(newTimeline2);
    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  it("should not do anything if the new timeline is empty", () => {
    const oldTimeline = [{ start: 0, duration: 1000, repeatCount: 10 }];
    const newTimeline : IIndexSegment[] = [];
    const oldTimelineCloned = oldTimeline.slice();
    updateSegmentTimeline?.(oldTimeline, newTimeline);
    expect(oldTimeline).toEqual(oldTimelineCloned);
    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  it("should not do anything if the timelines are equal", () => {
    const oldTimeline1 = [{ start: 0, duration: 1000, repeatCount: 10 }];
    const newTimeline1 = [{ start: 0, duration: 1000, repeatCount: 10 }];
    const oldTimeline1Cloned = oldTimeline1.slice();
    updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    expect(oldTimeline1).toEqual(oldTimeline1Cloned);

    const oldTimeline2 = [ { start: 0, duration: 1000, repeatCount: 10 },
                           { start: 11000, duration: 1000, repeatCount: 0 },
                           { start: 12000, duration: 1000, repeatCount: 1 } ];
    const newTimeline2 = [ { start: 0, duration: 1000, repeatCount: 10 },
                           { start: 11000, duration: 1000, repeatCount: 0 },
                           { start: 12000, duration: 1000, repeatCount: 1 } ];
    const oldTimeline2Cloned = oldTimeline2.slice();
    updateSegmentTimeline?.(oldTimeline2, newTimeline2);
    expect(oldTimeline2).toEqual(oldTimeline2Cloned);
    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  /* eslint-disable max-len */
  it("should throw if the new timeline begin long after the old one", () => {
  /* eslint-enable max-len */
    const oldTimeline1 = [ { start: 0, duration: 1000, repeatCount: 10 },
                           { start: 11000, duration: 1000, repeatCount: 0 } ];
    const newTimeline1 = [ { start: 13000, duration: 1000, repeatCount: 10 },
                           { start: 24000, duration: 1000, repeatCount: 0 },
                           { start: 25000, duration: 1000, repeatCount: 1 } ];
    const oldTimeline1Cloned = oldTimeline1.slice();

    let err = null;
    try {
      updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(err instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect((err as { type? : string }).type).toEqual("MEDIA_ERROR");
    expect((err as { code? : string }).code).toEqual("MANIFEST_UPDATE_ERROR");
    expect(err.message)
      .toEqual("MediaError (MANIFEST_UPDATE_ERROR) Cannot perform " +
               "partial update: not enough data");
    expect(oldTimeline1).toEqual(oldTimeline1Cloned);
    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  it("should merge consecutive timelines", () => {
    const oldTimeline1 = [ { start: 0, duration: 500, repeatCount: 20 },
                           { start: 11000, duration: 1000, repeatCount: 0 } ];
    const newTimeline1 = [ { start: 12000, duration: 1000, repeatCount: 11 },
                           { start: 24000, duration: 1100, repeatCount: 0 },
                           { start: 25100, duration: 1000, repeatCount: 1 } ];
    const oldTimeline1Cloned = oldTimeline1.slice();
    const newTimeline1Cloned = newTimeline1.slice();
    updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    expect(oldTimeline1).toEqual([...oldTimeline1Cloned, ...newTimeline1Cloned]);
    expect(logWarnSpy).not.toHaveBeenCalled();

    // With repeats

    const oldTimeline2 = [ { start: 0, duration: 500, repeatCount: 20 },
                           { start: 11000, duration: 1000, repeatCount: 8 } ];
    const newTimeline2 = [ { start: 20000, duration: 1000, repeatCount: 3 },
                           { start: 24000, duration: 1100, repeatCount: 0 },
                           { start: 25100, duration: 1000, repeatCount: 1 } ];
    const oldTimeline2Cloned = oldTimeline2.slice();
    const newTimeline2Cloned = newTimeline2.slice();
    updateSegmentTimeline?.(oldTimeline2, newTimeline2);
    expect(oldTimeline2).toEqual([...oldTimeline2Cloned, ...newTimeline2Cloned]);
    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  /* eslint-disable max-len */
  it("should merge consecutive timelines with a repeatCount set to -1 for the old timeline", () => {
  /* eslint-enable max-len */
    const oldTimeline1 = [ { start: 0, duration: 500, repeatCount: 20 },
                           { start: 11000, duration: 1000, repeatCount: -1 } ];
    const newTimeline1 = [ { start: 12000, duration: 1000, repeatCount: 11 },
                           { start: 24000, duration: 1100, repeatCount: 0 },
                           { start: 25100, duration: 1000, repeatCount: 1 } ];
    updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    expect(oldTimeline1).toEqual([
      { start: 0, duration: 500, repeatCount: 20 },
      { start: 11000, duration: 1000, repeatCount: 0 },
      { start: 12000, duration: 1000, repeatCount: 11 },
      { start: 24000, duration: 1100, repeatCount: 0 },
      { start: 25100, duration: 1000, repeatCount: 1 },
    ]);

    const oldTimeline2 = [ { start: 0, duration: 500, repeatCount: 20 },
                           { start: 11000, duration: 1000, repeatCount: -1 } ];
    const newTimeline2 = [ { start: 20000, duration: 1000, repeatCount: 3 },
                           { start: 24000, duration: 1100, repeatCount: 0 },
                           { start: 25100, duration: 1000, repeatCount: 1 } ];
    updateSegmentTimeline?.(oldTimeline2, newTimeline2);
    expect(oldTimeline2).toEqual([
      { start: 0, duration: 500, repeatCount: 20 },
      { start: 11000, duration: 1000, repeatCount: 8 },
      { start: 20000, duration: 1000, repeatCount: 3 },
      { start: 24000, duration: 1100, repeatCount: 0 },
      { start: 25100, duration: 1000, repeatCount: 1 },
    ]);
    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  it("should merge perfectly overlapping timelines without repeatCounts", () => {
    const oldTimeline1 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 0 },
                           { start: 1500, duration: 1000, repeatCount: 0 } ];
    const newTimeline1 = [ { start: 1000, duration: 500, repeatCount: 0 },
                           { start: 1500, duration: 1000, repeatCount: 0 },
                           { start: 2500, duration: 500, repeatCount: 0 },
                           { start: 3000, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    expect(oldTimeline1).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 0 },
      { start: 1500, duration: 1000, repeatCount: 0 },
      { start: 2500, duration: 500, repeatCount: 0 },
      { start: 3000, duration: 5000, repeatCount: 0 },
    ]);
    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  it("should merge perfectly overlapping timelines with repeatCounts", () => {
    const oldTimeline1 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 21 },
                           { start: 12000, duration: 1000, repeatCount: 0 } ];
    const newTimeline1 = [ { start: 2000, duration: 500, repeatCount: 19 },
                           { start: 12000, duration: 1000, repeatCount: 0 },
                           { start: 13000, duration: 7000, repeatCount: 0 },
                           { start: 20000, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    expect(oldTimeline1).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 21 },
      { start: 12000, duration: 1000, repeatCount: 0 },
      { start: 13000, duration: 7000, repeatCount: 0 },
      { start: 20000, duration: 5000, repeatCount: 0 },
    ]);
    expect(logWarnSpy).not.toHaveBeenCalled();

    const oldTimeline2 = [ { start: 1000, duration: 500, repeatCount: 21 },
                           { start: 12000, duration: 1000, repeatCount: 0 } ];
    const newTimeline2 = [ { start: 2000, duration: 500, repeatCount: 19 },
                           { start: 12000, duration: 1000, repeatCount: 0 },
                           { start: 13000, duration: 7000, repeatCount: 0 },
                           { start: 20000, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline2, newTimeline2);
    expect(oldTimeline2).toEqual([
      { start: 1000, duration: 500, repeatCount: 21 },
      { start: 12000, duration: 1000, repeatCount: 0 },
      { start: 13000, duration: 7000, repeatCount: 0 },
      { start: 20000, duration: 5000, repeatCount: 0 },
    ]);

    const oldTimeline3 = [ { start: 1000, duration: 500, repeatCount: 21 },
                           { start: 12000, duration: 1000, repeatCount: 0 } ];
    const newTimeline3 = [ { start: 2000, duration: 500, repeatCount: -1 },
                           { start: 12000, duration: 1000, repeatCount: 0 },
                           { start: 13000, duration: 7000, repeatCount: 0 },
                           { start: 20000, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline3, newTimeline3);
    expect(oldTimeline3).toEqual([
      { start: 1000, duration: 500, repeatCount: -1 },
      { start: 12000, duration: 1000, repeatCount: 0 },
      { start: 13000, duration: 7000, repeatCount: 0 },
      { start: 20000, duration: 5000, repeatCount: 0 },
    ]);
    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  it("should merge even if there are \"holes\" in the old timeline", () => {
    const oldTimeline1 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 0 },
                           { start: 12000, duration: 1000, repeatCount: 0 } ];
    const newTimeline1 = [ { start: 2000, duration: 500, repeatCount: 19 },
                           { start: 12000, duration: 1000, repeatCount: 0 },
                           { start: 13000, duration: 7000, repeatCount: 0 },
                           { start: 20000, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    expect(oldTimeline1).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 0 },
      { start: 2000, duration: 500, repeatCount: 19 },
      { start: 12000, duration: 1000, repeatCount: 0 },
      { start: 13000, duration: 7000, repeatCount: 0 },
      { start: 20000, duration: 5000, repeatCount: 0 },
    ]);

    const oldTimeline2 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 3 },
                           { start: 12000, duration: 1000, repeatCount: 0 } ];
    const newTimeline2 = [ { start: 4000, duration: 500, repeatCount: 15 },
                           { start: 12000, duration: 1000, repeatCount: 0 },
                           { start: 13000, duration: 7000, repeatCount: 0 },
                           { start: 20000, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline2, newTimeline2);
    expect(oldTimeline2).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 3 },
      { start: 4000, duration: 500, repeatCount: 15 },
      { start: 12000, duration: 1000, repeatCount: 0 },
      { start: 13000, duration: 7000, repeatCount: 0 },
      { start: 20000, duration: 5000, repeatCount: 0 },
    ]);

    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  /* eslint-disable max-len */
  it("should handle cases where the new timeline's start cannot be reached with the old timeline's repeatCount ", () => {
  /* eslint-enable max-len */
    const oldTimeline1 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 21 },
                           { start: 12000, duration: 1000, repeatCount: 0 } ];
    const newTimeline1 = [ { start: 2700, duration: 500, repeatCount: 19 },
                           { start: 12700, duration: 1000, repeatCount: 0 },
                           { start: 13700, duration: 7000, repeatCount: 0 },
                           { start: 20700, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    expect(oldTimeline1).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 2 },
      { start: 2700, duration: 500, repeatCount: 19 },
      { start: 12700, duration: 1000, repeatCount: 0 },
      { start: 13700, duration: 7000, repeatCount: 0 },
      { start: 20700, duration: 5000, repeatCount: 0 },
    ]);
    expect(logWarnSpy).toHaveBeenCalledTimes(1);
    expect(logWarnSpy).toHaveBeenCalledWith(
      "RepresentationIndex: Manifest update removed previous segments"
    );
    logWarnSpy?.mockClear();

    const oldTimeline2 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 21 } ];
    const newTimeline2 = [ { start: 2700, duration: 500, repeatCount: 19 },
                           { start: 12700, duration: 1000, repeatCount: 0 },
                           { start: 13700, duration: 7000, repeatCount: 0 },
                           { start: 20700, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline2, newTimeline2);
    expect(oldTimeline2).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 2 },
      { start: 2700, duration: 500, repeatCount: 19 },
      { start: 12700, duration: 1000, repeatCount: 0 },
      { start: 13700, duration: 7000, repeatCount: 0 },
      { start: 20700, duration: 5000, repeatCount: 0 },
    ]);
    expect(logWarnSpy).toHaveBeenCalledTimes(1);
    expect(logWarnSpy).toHaveBeenCalledWith(
      "RepresentationIndex: Manifest update removed previous segments"
    );
    logWarnSpy?.mockClear();

    const oldTimeline3 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 21 } ];
    const newTimeline3 = [ { start: 2700, duration: 500, repeatCount: 19 } ];
    updateSegmentTimeline?.(oldTimeline3, newTimeline3);
    expect(oldTimeline3).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 2 },
      { start: 2700, duration: 500, repeatCount: 19 },
    ]);
    expect(logWarnSpy).toHaveBeenCalledTimes(1);
    expect(logWarnSpy).toHaveBeenCalledWith(
      "RepresentationIndex: Manifest update removed previous segments"
    );
  });

  /* eslint-disable max-len */
  it("should handle cases where the repeatCount cannot be incremented due to different durations", () => {
  /* eslint-enable max-len */
    const oldTimeline1 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 21 },
                           { start: 12000, duration: 1000, repeatCount: 0 } ];
    const newTimeline1 = [ { start: 2000, duration: 1000, repeatCount: 9 },
                           { start: 12000, duration: 1000, repeatCount: 0 },
                           { start: 13000, duration: 7000, repeatCount: 0 },
                           { start: 20000, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    expect(oldTimeline1).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 1 },
      { start: 2000, duration: 1000, repeatCount: 9 },
      { start: 12000, duration: 1000, repeatCount: 0 },
      { start: 13000, duration: 7000, repeatCount: 0 },
      { start: 20000, duration: 5000, repeatCount: 0 },
    ]);
    expect(logWarnSpy).toHaveBeenCalledTimes(1);
    expect(logWarnSpy).toHaveBeenCalledWith(
      "RepresentationIndex: Manifest update removed previous segments"
    );
    logWarnSpy?.mockClear();

    const oldTimeline2 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 21 } ];
    const newTimeline2 = [ { start: 2000, duration: 1000, repeatCount: 9 },
                           { start: 12000, duration: 1000, repeatCount: 0 },
                           { start: 13000, duration: 7000, repeatCount: 0 },
                           { start: 20000, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline2, newTimeline2);
    expect(oldTimeline2).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 1 },
      { start: 2000, duration: 1000, repeatCount: 9 },
      { start: 12000, duration: 1000, repeatCount: 0 },
      { start: 13000, duration: 7000, repeatCount: 0 },
      { start: 20000, duration: 5000, repeatCount: 0 },
    ]);
    expect(logWarnSpy).toHaveBeenCalledTimes(1);
    expect(logWarnSpy).toHaveBeenCalledWith(
      "RepresentationIndex: Manifest update removed previous segments"
    );
    logWarnSpy?.mockClear();

    const oldTimeline3 = [ { start: 1000, duration: 500, repeatCount: 21 } ];
    const newTimeline3 = [ { start: 2000, duration: 1000, repeatCount: 9 } ];
    updateSegmentTimeline?.(oldTimeline3, newTimeline3);
    expect(oldTimeline3).toEqual([
      { start: 1000, duration: 500, repeatCount: 1 },
      { start: 2000, duration: 1000, repeatCount: 9 },
    ]);
    expect(logWarnSpy).toHaveBeenCalledTimes(1);
    expect(logWarnSpy).toHaveBeenCalledWith(
      "RepresentationIndex: Manifest update removed previous segments"
    );
  });

  it("should handle and log when there is a direct overlap (not due to a repeat)", () => {
    const oldTimeline1 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 0 },
                           { start: 1500, duration: 1500, repeatCount: 0 },
                           { start: 3000, duration: 9000, repeatCount: 0 } ];
    const newTimeline1 = [ { start: 2000, duration: 1000, repeatCount: 0 },
                           { start: 3000, duration: 9000, repeatCount: 0 },
                           { start: 12000, duration: 1000, repeatCount: 0 },
                           { start: 13000, duration: 7000, repeatCount: 0 },
                           { start: 20000, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    expect(oldTimeline1).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 0 },
      { start: 2000, duration: 1000, repeatCount: 0 },
      { start: 3000, duration: 9000, repeatCount: 0 },
      { start: 12000, duration: 1000, repeatCount: 0 },
      { start: 13000, duration: 7000, repeatCount: 0 },
      { start: 20000, duration: 5000, repeatCount: 0 },
    ]);
    expect(logWarnSpy).toHaveBeenCalledTimes(1);
    expect(logWarnSpy).toHaveBeenCalledWith(
      "RepresentationIndex: Manifest update removed previous segments"
    );
  });

  /* eslint-disable max-len */
  it("should handle the case where the new Timeline just increment the last repeatCount", () => {
  /* eslint-enable max-len */
    const oldTimeline1 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 21 } ];
    const newTimeline1 = [ { start: 1000, duration: 500, repeatCount: 51 } ];
    updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    expect(oldTimeline1).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 51 },
    ]);

    const oldTimeline2 = [ { start: 1000, duration: 500, repeatCount: 64 } ];
    const newTimeline2 = [ { start: 1000, duration: 500, repeatCount: 72 } ];
    updateSegmentTimeline?.(oldTimeline2, newTimeline2);
    expect(oldTimeline2).toEqual([ { start: 1000, duration: 500, repeatCount: 72 } ]);

    const oldTimeline3 = [ { start: 1000, duration: 500, repeatCount: 64 } ];
    const newTimeline3 = [ { start: 1000, duration: 500, repeatCount: 72 },
                           { start: 37500, duration: 1000, repeatCount: 5 }];
    updateSegmentTimeline?.(oldTimeline3, newTimeline3);
    expect(oldTimeline3).toEqual([
      { start: 1000, duration: 500, repeatCount: 72 },
      { start: 37500, duration: 1000, repeatCount: 5 },
    ]);

    expect(logWarnSpy).not.toHaveBeenCalled();
  });

  it("should handle when the newer timeline has more depth than the older one", () => {
    const oldTimeline1 = [ { start: 1000, duration: 500, repeatCount: 21 },
                           { start: 12000, duration: 1000, repeatCount: 0 } ];
    const newTimeline1 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 21 },
                           { start: 12000, duration: 1000, repeatCount: 0 },
                           { start: 13000, duration: 7000, repeatCount: 0 },
                           { start: 20000, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    expect(oldTimeline1).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 21 },
      { start: 12000, duration: 1000, repeatCount: 0 },
      { start: 13000, duration: 7000, repeatCount: 0 },
      { start: 20000, duration: 5000, repeatCount: 0 },
    ]);

    expect(logWarnSpy).toHaveBeenCalledTimes(1);
    expect(logWarnSpy)
      .toHaveBeenCalledWith(
        "RepresentationIndex: The new index is \"bigger\" than the previous one"
      );

    logWarnSpy?.mockClear();

    const oldTimeline2 = [ { start: 1000, duration: 500, repeatCount: 21 },
                           { start: 12000, duration: 1000, repeatCount: -1 } ];
    const newTimeline2 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 21 },
                           { start: 12000, duration: 1000, repeatCount: 0 },
                           { start: 13000, duration: 7000, repeatCount: 0 },
                           { start: 20000, duration: 5000, repeatCount: 0 } ];
    updateSegmentTimeline?.(oldTimeline2, newTimeline2);
    expect(oldTimeline2).toEqual([
      { start: 0, duration: 1000, repeatCount: 0 },
      { start: 1000, duration: 500, repeatCount: 21 },
      { start: 12000, duration: 1000, repeatCount: 0 },
      { start: 13000, duration: 7000, repeatCount: 0 },
      { start: 20000, duration: 5000, repeatCount: 0 },
    ]);

    expect(logWarnSpy).toHaveBeenCalledTimes(1);
    expect(logWarnSpy)
      .toHaveBeenCalledWith(
        "RepresentationIndex: The new index is \"bigger\" than the previous one"
      );
  });

  it("should handle when the newer timeline is actually older than the older one", () => {
    const oldTimeline1 = [ { start: 1000, duration: 500, repeatCount: 21 },
                           { start: 12000, duration: 1000, repeatCount: 0 },
                           { start: 13000, duration: 7000, repeatCount: 0 },
                           { start: 20000, duration: 5000, repeatCount: 0 } ];
    const newTimeline1 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 21 } ];
    updateSegmentTimeline?.(oldTimeline1, newTimeline1);
    expect(oldTimeline1).toEqual([
      { start: 1000, duration: 500, repeatCount: 21 },
      { start: 12000, duration: 1000, repeatCount: 0 },
      { start: 13000, duration: 7000, repeatCount: 0 },
      { start: 20000, duration: 5000, repeatCount: 0 },
    ]);

    expect(logWarnSpy).toHaveBeenCalledTimes(1);
    expect(logWarnSpy)
      .toHaveBeenCalledWith(
        "RepresentationIndex: The new index is older than the previous one"
      );

    logWarnSpy?.mockClear();

    const oldTimeline2 = [ { start: 1000, duration: 500, repeatCount: 21 },
                           { start: 12000, duration: 1000, repeatCount: 0 },
                           { start: 13000, duration: 7000, repeatCount: 0 },
                           { start: 20000, duration: 5000, repeatCount: -1 } ];
    const newTimeline2 = [ { start: 0, duration: 1000, repeatCount: 0 },
                           { start: 1000, duration: 500, repeatCount: 21 } ];
    updateSegmentTimeline?.(oldTimeline2, newTimeline2);
    expect(oldTimeline2).toEqual([
      { start: 1000, duration: 500, repeatCount: 21 },
      { start: 12000, duration: 1000, repeatCount: 0 },
      { start: 13000, duration: 7000, repeatCount: 0 },
      { start: 20000, duration: 5000, repeatCount: -1 },
    ]);

    expect(logWarnSpy).toHaveBeenCalledTimes(1);
    expect(logWarnSpy)
      .toHaveBeenCalledWith(
        "RepresentationIndex: The new index is older than the previous one"
      );

    logWarnSpy?.mockClear();
  });
});
