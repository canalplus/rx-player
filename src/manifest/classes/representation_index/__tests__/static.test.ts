import { describe, it, expect, vi } from "vitest";

import log from "../../../../log";
import StaticRepresentationIndex from "../static";

describe("manifest - StaticRepresentationIndex", () => {
  it("should return no init segment", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.getInitSegment()).toBe(null);
  });

  it("should return a single segment with the maximum duration and the right url", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.getSegments()).toEqual([
      {
        id: "0",
        complete: true,
        isInit: false,
        number: 0,
        time: 0,
        duration: Number.MAX_VALUE,
        end: Number.MAX_VALUE,
        timescale: 1,
        privateInfos: {},
        url: "foo",
      },
    ]);
  });

  it("should return no first position", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.getFirstAvailablePosition()).toBe(undefined);
  });

  it("should return no last position", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.getLastAvailablePosition()).toBe(undefined);
  });

  it("should never be refreshed", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.shouldRefresh()).toBe(false);
  });

  it("should never have a discontinuity", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.checkDiscontinuity()).toBe(null);
  });

  it("should never be awaiting segments", () => {
    const staticRI = new StaticRepresentationIndex({ media: "foo" });
    expect(staticRI.awaitSegmentBetween()).toBe(false);
  });

  it("should never replace and warn when trying to do so", () => {
    const spy = vi.fn();
    vi.spyOn(log, "warn").mockImplementation(spy);
    const staticRI = new StaticRepresentationIndex({ media: "foo" });

    staticRI._replace();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
