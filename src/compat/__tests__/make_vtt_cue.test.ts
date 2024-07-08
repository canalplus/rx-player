import { describe, beforeEach, it, expect, vi } from "vitest";
import globalScope from "../../utils/global_scope";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("Compat - makeVTTCue", () => {
  class MockVTTCue {
    public startTime: number;
    public endTime: number;
    public text: string;
    constructor(start: number, end: number, text: string) {
      this.startTime = start;
      this.endTime = end;
      this.text = text;
    }
  }

  const gs = globalScope as {
    VTTCue?: unknown;
    TextTrackCue?: unknown;
  };

  const ogVTTuCue = gs.VTTCue;
  const ogTextTrackCue = gs.TextTrackCue;
  beforeEach(() => {
    vi.resetModules();
    gs.VTTCue = ogVTTuCue;
    gs.TextTrackCue = ogTextTrackCue;
  });

  it("should throw if nor VTTCue nor TextTrackCue is available", async () => {
    const mockLog = { warn: vi.fn() };
    gs.VTTCue = undefined;
    gs.TextTrackCue = undefined;
    vi.doMock("../../log", () => ({
      default: mockLog,
    }));
    const makeCue = (await vi.importActual("../make_vtt_cue")) as any;
    let result: unknown;
    let error: unknown;
    try {
      result = makeCue.default(5, 10, "toto");
    } catch (e: unknown) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toEqual("VTT cues not supported in your target");
    expect(result).toBe(undefined);
    expect(mockLog.warn).not.toHaveBeenCalled();
  });

  it("should warn and not create anything if start time is after end time", async () => {
    const mockLog = { warn: vi.fn() };
    gs.VTTCue = MockVTTCue;
    vi.doMock("../../log", () => ({
      default: mockLog,
    }));
    const makeCue = (await vi.importActual("../make_vtt_cue")) as any;
    const result = makeCue.default(12, 10, "toto");
    expect(result).toBeNull();
    expect(mockLog.warn).toHaveBeenCalledTimes(1);
    expect(mockLog.warn).toHaveBeenCalledWith("Compat: Invalid cue times: 12 - 10");
  });

  it("should create a new VTT Cue in other cases", async () => {
    const mockLog = { warn: vi.fn() };
    gs.VTTCue = MockVTTCue;
    vi.doMock("../../log", () => ({
      default: mockLog,
    }));
    const makeCue = (await vi.importActual("../make_vtt_cue")) as any;
    const result = makeCue.default(10, 12, "toto");
    expect(result).toEqual(new MockVTTCue(10, 12, "toto"));
    expect(mockLog.warn).not.toHaveBeenCalled();
  });
});
