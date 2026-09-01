import { describe, expect, it } from "vitest";
import getInitSegment from "../../../../../../../../src/parsers/manifest/dash/common/indexes/get_init_segment.ts";

describe("getInitSegment", () => {
  it("returns null when no initialization segment is declared", () => {
    expect(
      getInitSegment({
        timescale: 1,
        initialization: null,
        indexRange: [0, 10],
        indexTimeOffset: 0,
      }),
    ).toBeNull();
  });

  it("returns an initialization segment when its URL is declared", () => {
    expect(
      getInitSegment({
        timescale: 10,
        initialization: { url: "init.mp4" },
        indexTimeOffset: 5,
      }),
    ).toMatchObject({
      id: "init",
      isInit: true,
      range: undefined,
      url: "init.mp4",
      timestampOffset: -0.5,
    });
  });

  it("keeps an initialization segment declared through a byte range", () => {
    expect(
      getInitSegment({
        timescale: 1,
        initialization: { url: null, range: [0, 99] },
        indexRange: [100, 199],
        indexTimeOffset: 0,
      }),
    ).toMatchObject({
      isInit: true,
      range: [0, 99],
      indexRange: [100, 199],
      url: null,
    });
  });
});
