import { describe, beforeEach, it, expect, vi } from "vitest";
import type { ISegment } from "../../../../../src/manifest/index.ts";
import extractTimingsInfos from "../../../../../src/transports/smooth/extract_timings_infos.ts";

const mocks = vi.hoisted(() => {
  return {
    getTRAF: vi.fn(),
    getDurationFromTrun: vi.fn(),
    parseTfrf: vi.fn(),
    parseTfxd: vi.fn(),
    logWarn: vi.fn(),
  };
});
vi.mock("../../../../../src/parsers/containers/isobmff", () => ({
  getTRAF: mocks.getTRAF,
  getDurationFromTrun: mocks.getDurationFromTrun,
}));
vi.mock("../../../../../src/transports/smooth/isobmff", () => ({
  parseTfrf: mocks.parseTfrf,
  parseTfxd: mocks.parseTfxd,
}));
vi.mock("../../../../../src/log", () => ({
  default: { warn: mocks.logWarn, debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const THROWN_VALUES = [new Error("ISOBMFF: Size out of range"), "not an error"];

function throwing(err: unknown): () => never {
  return () => {
    throw err;
  };
}

const TIMESCALE = 1000;
const data = new Uint8Array([0, 1, 2]);
const traf = new Uint8Array([3, 4, 5]);
const segment = { time: 10, duration: 2, complete: true } as ISegment;

/** What is obtained when only trun can be relied on. */
const FROM_TRUN = { time: 10, duration: 2.1 };
/** What is obtained when only the segment's information can be relied on. */
const FROM_SEGMENT = { time: 10, duration: 2 };

describe("Smooth - extractTimingsInfos", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getTRAF.mockReturnValue(traf);
    mocks.parseTfrf.mockReturnValue([{ time: 12000, duration: 2000 }]);
    mocks.parseTfxd.mockReturnValue({ time: 10000, duration: 2000 });
    mocks.getDurationFromTrun.mockReturnValue(2100);
  });

  it("should use tfxd and tfrf for live contents", () => {
    const res = extractTimingsInfos(data, false, TIMESCALE, segment, true);
    expect(res.chunkInfos).toEqual({ time: 10, duration: 2 });
    expect(res.scaledSegmentTime).toBe(10000);
    expect(res.nextSegments).toEqual([{ time: 12000, duration: 2000, timescale: 1000 }]);
    expect(mocks.parseTfrf).toHaveBeenCalledWith(traf);
    expect(mocks.parseTfxd).toHaveBeenCalledWith(traf);
    expect(mocks.logWarn).not.toHaveBeenCalled();
  });

  it("should use trun for non-live contents", () => {
    const res = extractTimingsInfos(data, false, TIMESCALE, segment, false);
    expect(res.chunkInfos).toEqual(FROM_TRUN);
    expect(res.nextSegments).toEqual([]);
    expect(mocks.getTRAF).not.toHaveBeenCalled();
  });

  for (const thrown of THROWN_VALUES) {
    const loggedErr = thrown instanceof Error ? thrown : "";

    describe(`when reading boxes throws ${String(thrown)}`, () => {
      it("should fall back to trun if traf cannot be read", () => {
        mocks.getTRAF.mockImplementation(throwing(thrown));
        const res = extractTimingsInfos(data, false, TIMESCALE, segment, true);
        expect(res.chunkInfos).toEqual(FROM_TRUN);
        expect(res.nextSegments).toEqual([]);
        expect(mocks.parseTfrf).not.toHaveBeenCalled();
        expect(mocks.parseTfxd).not.toHaveBeenCalled();
        expect(mocks.logWarn).toHaveBeenCalledWith(
          "smooth",
          "could not read traf atom",
          loggedErr,
        );
      });

      it("should still use tfxd if tfrf cannot be read", () => {
        mocks.parseTfrf.mockImplementation(throwing(thrown));
        const res = extractTimingsInfos(data, false, TIMESCALE, segment, true);
        expect(res.chunkInfos).toEqual({ time: 10, duration: 2 });
        expect(res.scaledSegmentTime).toBe(10000);
        expect(res.nextSegments).toEqual([]);
        expect(mocks.logWarn).toHaveBeenCalledWith(
          "smooth",
          "could not read tfrf box",
          loggedErr,
        );
      });

      it("should still use tfrf and fall back to trun if tfxd cannot be read", () => {
        mocks.parseTfxd.mockImplementation(throwing(thrown));
        const res = extractTimingsInfos(data, false, TIMESCALE, segment, true);
        expect(res.chunkInfos).toEqual(FROM_TRUN);
        expect(res.nextSegments).toEqual([
          { time: 12000, duration: 2000, timescale: 1000 },
        ]);
        expect(mocks.logWarn).toHaveBeenCalledWith(
          "smooth",
          "could not read tfxd box",
          loggedErr,
        );
      });

      it("should fall back to trun if neither tfrf nor tfxd can be read", () => {
        mocks.parseTfrf.mockImplementation(throwing(thrown));
        mocks.parseTfxd.mockImplementation(throwing(thrown));
        const res = extractTimingsInfos(data, false, TIMESCALE, segment, true);
        expect(res.chunkInfos).toEqual(FROM_TRUN);
        expect(res.nextSegments).toEqual([]);
        expect(mocks.logWarn).toHaveBeenCalledTimes(2);
      });

      for (const isLive of [false, true]) {
        it(`should fall back to the segment's information if trun cannot be read (live: ${isLive})`, () => {
          mocks.getTRAF.mockReturnValue(null);
          mocks.getDurationFromTrun.mockImplementation(throwing(thrown));
          const res = extractTimingsInfos(data, false, TIMESCALE, segment, isLive);
          expect(res.chunkInfos).toEqual(FROM_SEGMENT);
          expect(res.scaledSegmentTime).toBe(10000);
          expect(mocks.logWarn).toHaveBeenCalledWith(
            "smooth",
            "could not read duration from trun",
            loggedErr,
          );
        });
      }

      it("should give no information if nothing can be read", () => {
        mocks.getTRAF.mockImplementation(throwing(thrown));
        mocks.getDurationFromTrun.mockImplementation(throwing(thrown));
        const res = extractTimingsInfos(data, false, TIMESCALE, segment, true);
        expect(res.chunkInfos).toEqual(FROM_SEGMENT);
        expect(res.nextSegments).toEqual([]);
      });

      it("should not read trun for chunked segments", () => {
        mocks.getTRAF.mockImplementation(throwing(thrown));
        mocks.getDurationFromTrun.mockImplementation(throwing(thrown));
        const res = extractTimingsInfos(data, true, TIMESCALE, segment, true);
        expect(res.chunkInfos).toBe(null);
        expect(mocks.getDurationFromTrun).not.toHaveBeenCalled();
      });
    });
  }
});
