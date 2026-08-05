import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import log from "../../log.ts";
import globalScope from "../../utils/global_scope.ts";
import makeCue from "../make_vtt_cue.ts";

const logWarn = vi.spyOn(log, "warn").mockImplementation(() => {
  /* noop */
});

describe("Compat - makeVTTCue", () => {
  afterEach(() => {
    logWarn.mockClear();
  });
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

  it("should throw if nor VTTCue nor TextTrackCue is available", () => {
    gs.VTTCue = undefined;
    gs.TextTrackCue = undefined;
    let result: unknown;
    let error: unknown;
    try {
      result = makeCue(5, 10, "toto");
    } catch (e: unknown) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toEqual("VTT cues not supported in your target");
    expect(result).toBe(undefined);
    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should warn and not create anything if start time is after end time", () => {
    gs.VTTCue = MockVTTCue;
    const result = makeCue(12, 10, "toto");
    expect(result).toBeNull();
    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith("text", "Invalid cue times: start after end.", {
      endTime: 10,
      startTime: 12,
    });
  });

  it("should create a new VTT Cue in other cases", () => {
    gs.VTTCue = MockVTTCue;
    const result = makeCue(10, 12, "toto");
    expect(result).toEqual(new MockVTTCue(10, 12, "toto"));
    expect(logWarn).not.toHaveBeenCalled();
  });
});
