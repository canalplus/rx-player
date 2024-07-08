import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

import arrayFindIndex from "../../utils/array_find_index";

describe("compat - removeCue", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should remove cue from track if not on firefox", async () => {
    const fakeTrackCues = [{ id: "1" }];

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
    };

    vi.doMock("../browser_detection", () => ({
      isFirefox: false,
    }));

    const removeCue = ((await vi.importActual("../remove_cue")) as any).default;
    removeCue(fakeTrack, { id: "1" });

    expect(fakeTrack.cues.length).toBe(0);
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockGetMode).not.toHaveBeenCalled();
    expect(mockSetMode).not.toHaveBeenCalled();
    expect(fakeTrack.mode).toBe("showing");
    expect(mockRemoveCue).toHaveBeenLastCalledWith({ id: "1" });
  });

  it("should remove cue from track if on firefox and is active cue", async () => {
    const fakeCue = { id: "1" };
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
    };

    vi.doMock("../browser_detection", () => ({
      isFirefox: true,
    }));

    const removeCue = ((await vi.importActual("../remove_cue")) as any).default;
    removeCue(fakeTrack, fakeCue);

    expect(fakeTrack.cues.length).toBe(0);
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockGetMode).toHaveBeenCalledTimes(1);
    expect(mockSetMode).toHaveBeenCalledTimes(2);
    expect(fakeTrack.mode).toBe("showing");
    expect(mockRemoveCue).toHaveBeenLastCalledWith(fakeCue);
  });

  it("should remove cue from track if on firefox and is not active cue", async () => {
    const fakeCue = { id: "1" };
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
    };

    vi.doMock("../browser_detection", () => ({
      isFirefox: true,
    }));

    const removeCue = ((await vi.importActual("../remove_cue")) as any).default;
    removeCue(fakeTrack, fakeCue);

    expect(fakeTrack.cues.length).toBe(0);
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockGetMode).not.toHaveBeenCalled();
    expect(mockSetMode).not.toHaveBeenCalled();
    expect(fakeTrack.mode).toBe("showing");
    expect(mockRemoveCue).toHaveBeenLastCalledWith(fakeCue);
  });

  it("should log if removeCue throws if on firefox and is active cue", async () => {
    const fakeCue = { id: "1" };
    const fakeTrackCues = [fakeCue];
    const mockRemoveCue = vi.fn(() => {
      throw new Error();
    });
    const mockLog = vi.fn((message) => message);

    vi.doMock("../browser_detection", () => ({
      isFirefox: true,
    }));
    vi.doMock("../../log", () => ({
      default: {
        warn: mockLog,
      },
    }));

    const fakeTrack = {
      mode: "showing",
      cues: fakeTrackCues,
      activeCues: fakeTrackCues,
      removeCue: mockRemoveCue,
    };

    const removeCue = ((await vi.importActual("../remove_cue")) as any).default;
    removeCue(fakeTrack, fakeCue);

    expect(fakeTrack.cues.length).toBe(1);
    expect(fakeTrack.mode).toBe("showing");
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith("Compat: Could not remove cue from text track.");
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockRemoveCue).toHaveBeenLastCalledWith(fakeCue);
  });

  it("should log if removeCue throws if not on firefox", async () => {
    const mockLog = vi.fn((message) => message);
    const mockRemoveCue = vi.fn(() => {
      throw new Error();
    });

    vi.doMock("../browser_detection", () => ({
      isFirefox: false,
    }));
    vi.doMock("../../log", () => ({
      default: {
        warn: mockLog,
      },
    }));

    const fakeTrack = {
      mode: "showing",
      cues: [{ id: "1" }],
      removeCue: mockRemoveCue,
    };

    const removeCue = ((await vi.importActual("../remove_cue")) as any).default;
    removeCue(fakeTrack, { id: "1" });

    expect(fakeTrack.cues.length).toBe(1);
    expect(fakeTrack.mode).toBe("showing");
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith("Compat: Could not remove cue from text track.");
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockRemoveCue).toHaveBeenLastCalledWith({ id: "1" });
  });
});
