import { describe, it, expect } from "vitest";
import globalScope from "../../utils/global_scope.ts";
import isVTTCue from "../is_vtt_cue.ts";

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

  it("should return true if the given cue is an instance of a vtt cue", () => {
    const originalVTTCue = globalScope.VTTCue;
    gs.VTTCue = MockVTTCue;
    const cue = new VTTCue(0, 10, "");
    expect(isVTTCue(cue)).toEqual(true);
    globalScope.VTTCue = originalVTTCue;
  });

  it("should return false if the given cue is not an instance of a vtt cue", () => {
    const originalVTTCue = globalScope.VTTCue;
    gs.VTTCue = MockVTTCue;
    const cue = {
      startTime: 0,
      endTime: 10,
      text: "toto",
    } as unknown as VTTCue;
    expect(isVTTCue(cue)).toEqual(false);
    globalScope.VTTCue = originalVTTCue;
  });

  it("should return false in any case if the global scope does not define a VTTCue", () => {
    const originalVTTCue = globalScope.VTTCue;
    gs.VTTCue = MockVTTCue;
    const cue = new VTTCue(0, 10, "");
    delete gs.VTTCue;
    expect(isVTTCue(cue)).toEqual(false);
    globalScope.VTTCue = originalVTTCue;
  });
});
