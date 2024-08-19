import { describe, beforeEach, it, expect, vi } from "vitest";
import arrayFindIndex from "../../utils/array_find_index";
import type IRemoveCue from "../remove_cue";

describe("compat - removeCue", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should remove cue from track if not on firefox", async () => {
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

    vi.doMock("../browser_detection", () => ({
      isFirefox: false,
    }));

    const removeCue = (await vi.importActual("../remove_cue"))
      .default as typeof IRemoveCue;
    removeCue(fakeTrack, { id: "1" } as unknown as TextTrackCue);

    expect(fakeTrack.cues?.length).toBe(0);
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockGetMode).not.toHaveBeenCalled();
    expect(mockSetMode).not.toHaveBeenCalled();
    expect(fakeTrack.mode).toBe("showing");
    expect(mockRemoveCue).toHaveBeenLastCalledWith({ id: "1" });
  });

  it("should remove cue from track if on firefox and is active cue", async () => {
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

    vi.doMock("../browser_detection", () => ({
      isFirefox: true,
    }));

    const removeCue = (await vi.importActual("../remove_cue"))
      .default as typeof IRemoveCue;
    removeCue(fakeTrack, fakeCue);

    expect(fakeTrack.cues?.length).toBe(0);
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockGetMode).toHaveBeenCalledTimes(1);
    expect(mockSetMode).toHaveBeenCalledTimes(2);
    expect(fakeTrack.mode).toBe("showing");
    expect(mockRemoveCue).toHaveBeenLastCalledWith(fakeCue);
  });

  it("should remove cue from track if on firefox and is not active cue", async () => {
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

    vi.doMock("../browser_detection", () => ({
      isFirefox: true,
    }));

    const removeCue = (await vi.importActual("../remove_cue"))
      .default as typeof IRemoveCue;
    removeCue(fakeTrack, fakeCue);

    expect(fakeTrack.cues?.length).toBe(0);
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockGetMode).not.toHaveBeenCalled();
    expect(mockSetMode).not.toHaveBeenCalled();
    expect(fakeTrack.mode).toBe("showing");
    expect(mockRemoveCue).toHaveBeenLastCalledWith(fakeCue);
  });

  it("should log if removeCue throws if on firefox and is active cue", async () => {
    const fakeCue: TextTrackCue = { id: "1" } as unknown as TextTrackCue;
    const fakeTrackCues = [fakeCue];
    const mockRemoveCue = vi.fn(() => {
      throw new Error();
    });
    const mockLog = vi.fn((message: unknown) => message);

    vi.doMock("../browser_detection", () => ({
      isFirefox: true,
    }));
    vi.doMock("../../log", () => ({
      default: {
        warn: mockLog,
      },
    }));

    const fakeTrack: TextTrack = {
      mode: "showing",
      cues: fakeTrackCues,
      activeCues: fakeTrackCues,
      removeCue: mockRemoveCue,
    } as unknown as TextTrack;

    const removeCue = (await vi.importActual("../remove_cue"))
      .default as typeof IRemoveCue;
    removeCue(fakeTrack, fakeCue);

    expect(fakeTrack.cues?.length).toBe(1);
    expect(fakeTrack.mode).toBe("showing");
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith("Compat: Could not remove cue from text track.");
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockRemoveCue).toHaveBeenLastCalledWith(fakeCue);
  });

  it("should log if removeCue throws if not on firefox", async () => {
    const mockLog = vi.fn((message: unknown) => message);
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
    } as unknown as TextTrack;

    const removeCue = (await vi.importActual("../remove_cue"))
      .default as typeof IRemoveCue;
    removeCue(fakeTrack, { id: "1" } as unknown as TextTrackCue);

    expect(fakeTrack.cues?.length).toBe(1);
    expect(fakeTrack.mode).toBe("showing");
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith("Compat: Could not remove cue from text track.");
    expect(mockRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockRemoveCue).toHaveBeenLastCalledWith({ id: "1" });
  });
});
