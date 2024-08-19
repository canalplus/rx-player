import { describe, it, expect, vi } from "vitest";
import globalScope from "../../utils/global_scope";
import type IIsVTTCue from "../is_vtt_cue";

describe("Compat - isVTTCue", () => {
  interface IFakeWindow {
    VTTCue?: VTTCue | typeof MockVTTCue;
  }
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
  const gs = globalScope as IFakeWindow;

  it("should return true if the given cue is an instance of a vtt cue", async () => {
    const originalVTTCue = globalScope.VTTCue;
    gs.VTTCue = MockVTTCue;
    const cue = new VTTCue(0, 10, "");
    const isVTTCue = (await vi.importActual("../is_vtt_cue")).default as typeof IIsVTTCue;
    expect(isVTTCue(cue)).toEqual(true);
    globalScope.VTTCue = originalVTTCue;
  });

  it("should return false if the given cue is not an instance of a vtt cue", async () => {
    const originalVTTCue = globalScope.VTTCue;
    gs.VTTCue = MockVTTCue;
    const cue = {
      startTime: 0,
      endTime: 10,
      text: "toto",
    } as unknown as VTTCue;
    const isVTTCue = (await vi.importActual("../is_vtt_cue")).default as typeof IIsVTTCue;
    expect(isVTTCue(cue)).toEqual(false);
    globalScope.VTTCue = originalVTTCue;
  });

  it("should return false in any case if the global scope does not define a VTTCue", async () => {
    const originalVTTCue = globalScope.VTTCue;
    gs.VTTCue = MockVTTCue;
    const cue = new VTTCue(0, 10, "");
    delete gs.VTTCue;
    const isVTTCue = (await vi.importActual("../is_vtt_cue")).default as typeof IIsVTTCue;
    expect(isVTTCue(cue)).toEqual(false);
    globalScope.VTTCue = originalVTTCue;
  });
});
