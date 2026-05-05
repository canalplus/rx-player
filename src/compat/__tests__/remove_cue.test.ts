import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import log from "../../log.ts";
import arrayFindIndex from "../../utils/array_find_index.ts";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector.ts";
import removeCue from "../remove_cue.ts";

const logWarn = vi.spyOn(log, "warn").mockImplementation(() => {
  /* noop */
});

describe("compat - removeCue", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    resetEnvironment();
    logWarn.mockClear();
  });

  it("should remove cue from track if not on firefox", () => {
    const fakeTrackCues = [{ id: "1" }] as unknown as TextTrackCue[];

    const mockRemoveCue = vi.fn((cue: { id: string }) => {
      const idx = arrayFindIndex(fakeTrackCues, (c) => {
        return c.id === cue.id;
      });
      if (idx >= 0) {
        fakeTrackCues.splice(idx, 1);
      }
    });
    const mockGetMode = vi.fn(() => "showing");
    const mockSetMode = vi.fn(() => null);

    const fakeTrack = {
      get mode() {
        return mockGetMode();
      },
      set mode(_) {
        mockSetMode();
      },
      cues: fakeTrackCues,
      activeCues: [],
      removeCue: mockRemoveCue,
    } as unknown as TextTrack;

    mockEnvironment(EnvDetector.BROWSERS.SafariMobile, EnvDetector.DEVICES.Other);

    removeCue(fakeTrack, { id: "1" } as unknown as TextTrackCue);

    expect(fakeTrack.cues?.length).toBe(0);
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockGetMode).not.toHaveBeenCalled();
    expect(mockSetMode).not.toHaveBeenCalled();
    expect(fakeTrack.mode).toBe("showing");
    expect(mockRemoveCue).toHaveBeenLastCalledWith({ id: "1" });
  });

  it("should remove cue from track if on firefox and is active cue", () => {
    const fakeCue = { id: "1" } as unknown as TextTrackCue;
    const fakeTrackCues = [fakeCue];
    let fakeMode = "showing";

    const mockRemoveCue = vi.fn((cue: { id: string }) => {
      const idx = arrayFindIndex(fakeTrackCues, (c) => {
        return c.id === cue.id;
      });
      if (idx >= 0) {
        fakeTrackCues.splice(idx, 1);
      }
    });
    const mockGetMode = vi.fn(() => {
      return fakeMode;
    });
    const mockSetMode = vi.fn((newMode: string) => {
      fakeMode = newMode;
    });

    const fakeTrack = {
      get mode() {
        return mockGetMode();
      },
      set mode(newMode: string) {
        mockSetMode(newMode);
      },
      cues: fakeTrackCues,
      activeCues: fakeTrackCues,
      removeCue: mockRemoveCue,
    } as unknown as TextTrack;

    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);

    removeCue(fakeTrack, fakeCue);

    expect(fakeTrack.cues?.length).toBe(0);
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockGetMode).toHaveBeenCalledTimes(1);
    expect(mockSetMode).toHaveBeenCalledTimes(2);
    expect(fakeTrack.mode).toBe("showing");
    expect(mockRemoveCue).toHaveBeenLastCalledWith(fakeCue);
  });

  it("should remove cue from track if on firefox and is not active cue", () => {
    const fakeCue = { id: "1" } as unknown as TextTrackCue;
    const fakeTrackCue = [fakeCue];
    let fakeMode = "showing";

    const mockRemoveCue = vi.fn((cue: { id: string }) => {
      const idx = arrayFindIndex(fakeTrackCue, (c) => {
        return c.id === cue.id;
      });
      if (idx >= 0) {
        fakeTrackCue.splice(idx, 1);
      }
    });
    const mockGetMode = vi.fn(() => {
      return fakeMode;
    });
    const mockSetMode = vi.fn((newMode: string) => {
      fakeMode = newMode;
    });

    const fakeTrack = {
      get mode() {
        return mockGetMode();
      },
      set mode(newMode: string) {
        mockSetMode(newMode);
      },
      cues: fakeTrackCue,
      activeCues: [],
      removeCue: mockRemoveCue,
    } as unknown as TextTrack;

    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);

    removeCue(fakeTrack, fakeCue);

    expect(fakeTrack.cues?.length).toBe(0);
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockGetMode).not.toHaveBeenCalled();
    expect(mockSetMode).not.toHaveBeenCalled();
    expect(fakeTrack.mode).toBe("showing");
    expect(mockRemoveCue).toHaveBeenLastCalledWith(fakeCue);
  });

  it("should log if removeCue throws if on firefox and is active cue", () => {
    const fakeCue: TextTrackCue = { id: "1" } as unknown as TextTrackCue;
    const fakeTrackCues = [fakeCue];
    const mockRemoveCue = vi.fn(() => {
      throw new Error();
    });

    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);

    const fakeTrack: TextTrack = {
      mode: "showing",
      cues: fakeTrackCues,
      activeCues: fakeTrackCues,
      removeCue: mockRemoveCue,
    } as unknown as TextTrack;

    removeCue(fakeTrack, fakeCue);

    expect(fakeTrack.cues?.length).toBe(1);
    expect(fakeTrack.mode).toBe("showing");
    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith("text", "Could not remove cue from text track.");
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockRemoveCue).toHaveBeenLastCalledWith(fakeCue);
  });

  it("should log if removeCue throws if not on firefox", () => {
    const mockRemoveCue = vi.fn(() => {
      throw new Error();
    });

    mockEnvironment(EnvDetector.BROWSERS.SafariMobile, EnvDetector.DEVICES.Other);

    const fakeTrack = {
      mode: "showing",
      cues: [{ id: "1" }],
      removeCue: mockRemoveCue,
    } as unknown as TextTrack;

    removeCue(fakeTrack, { id: "1" } as unknown as TextTrackCue);

    expect(fakeTrack.cues?.length).toBe(1);
    expect(fakeTrack.mode).toBe("showing");
    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith("text", "Could not remove cue from text track.");
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockRemoveCue).toHaveBeenLastCalledWith({ id: "1" });
  });
});
