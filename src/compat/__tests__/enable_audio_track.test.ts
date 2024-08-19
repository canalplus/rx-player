import { describe, beforeEach, it, expect, vi } from "vitest";
import type IEnableAudioTrack from "../enable_audio_track";

describe("compat - enableAudioTrack", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should enable the wanted audioTrack", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isTizen: false,
      };
    });
    const fakeAudioTracks = [
      {
        id: "id1",
        kind: "descriptions",
        label: "Toto",
        language: "swa",
        enabled: true,
      },
      {
        id: "id2",
        kind: "normal",
        label: "Titi",
        language: "fre",
        enabled: false,
      },
      {
        id: "id26",
        kind: "bloop",
        label: "hay",
        language: "hay",
        enabled: false,
      },
    ];
    const enableAudioTrack = (await vi.importActual("../enable_audio_track"))
      .default as typeof IEnableAudioTrack;
    expect(enableAudioTrack(fakeAudioTracks, 2)).toEqual(true);
    expect(fakeAudioTracks[0].enabled).toBe(false);
    expect(fakeAudioTracks[1].enabled).toBe(false);
    expect(fakeAudioTracks[2].enabled).toBe(true);
    expect(enableAudioTrack(fakeAudioTracks, 1)).toEqual(true);
    expect(fakeAudioTracks[0].enabled).toBe(false);
    expect(fakeAudioTracks[1].enabled).toBe(true);
    expect(fakeAudioTracks[2].enabled).toBe(false);
    expect(enableAudioTrack(fakeAudioTracks, 0)).toEqual(true);
    expect(fakeAudioTracks[0].enabled).toBe(true);
    expect(fakeAudioTracks[1].enabled).toBe(false);
    expect(fakeAudioTracks[2].enabled).toBe(false);
  });

  it("should enable the wanted audioTrack on Tizen", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isTizen: true,
      };
    });
    const fakeAudioTracks = [
      {
        id: "id1",
        kind: "descriptions",
        label: "Toto",
        language: "swa",
        enabled: true,
      },
      {
        id: "id2",
        kind: "normal",
        label: "Titi",
        language: "fre",
        enabled: false,
      },
      {
        id: "id26",
        kind: "bloop",
        label: "hay",
        language: "hay",
        enabled: false,
      },
    ];
    const enableAudioTrack = (await vi.importActual("../enable_audio_track"))
      .default as typeof IEnableAudioTrack;
    expect(enableAudioTrack(fakeAudioTracks, 2)).toEqual(true);
    expect(fakeAudioTracks[0].enabled).toBe(false);
    expect(fakeAudioTracks[1].enabled).toBe(false);
    expect(fakeAudioTracks[2].enabled).toBe(true);
    expect(enableAudioTrack(fakeAudioTracks, 1)).toEqual(true);
    expect(fakeAudioTracks[0].enabled).toBe(false);
    expect(fakeAudioTracks[1].enabled).toBe(true);
    expect(fakeAudioTracks[2].enabled).toBe(false);
    expect(enableAudioTrack(fakeAudioTracks, 0)).toEqual(true);
    expect(fakeAudioTracks[0].enabled).toBe(true);
    expect(fakeAudioTracks[1].enabled).toBe(false);
    expect(fakeAudioTracks[2].enabled).toBe(false);
  });

  it("should return false if the audio track index does not exist", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isTizen: false,
      };
    });
    const fakeAudioTracks = [
      {
        id: "id1",
        kind: "descriptions",
        label: "Toto",
        language: "swa",
        enabled: true,
      },
      {
        id: "id2",
        kind: "normal",
        label: "Titi",
        language: "fre",
        enabled: false,
      },
      {
        id: "id26",
        kind: "bloop",
        label: "hay",
        language: "hay",
        enabled: false,
      },
    ];
    const enableAudioTrack = (await vi.importActual("../enable_audio_track"))
      .default as typeof IEnableAudioTrack;
    expect(enableAudioTrack(fakeAudioTracks, -1)).toEqual(false);
    expect(fakeAudioTracks[0].enabled).toBe(false);
    expect(fakeAudioTracks[1].enabled).toBe(false);
    expect(fakeAudioTracks[2].enabled).toBe(false);
    expect(enableAudioTrack(fakeAudioTracks, 0)).toEqual(true);
    expect(fakeAudioTracks[0].enabled).toBe(true);
    expect(fakeAudioTracks[1].enabled).toBe(false);
    expect(fakeAudioTracks[2].enabled).toBe(false);
    expect(enableAudioTrack(fakeAudioTracks, 4)).toEqual(false);
    expect(fakeAudioTracks[0].enabled).toBe(false);
    expect(fakeAudioTracks[1].enabled).toBe(false);
    expect(fakeAudioTracks[2].enabled).toBe(false);
  });

  it("should return false if the audio track index does not exist on Tizen", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isTizen: false,
      };
    });
    let track1IsEnabled = true;
    let track2IsEnabled = false;
    let track3IsEnabled = false;
    let track1WasDisabled = 0;
    let track2WasDisabled = 0;
    let track3WasDisabled = 0;
    let track1WasEnabled = 0;
    let track2WasEnabled = 0;
    let track3WasEnabled = 0;
    const fakeAudioTracks = [
      {
        id: "id1",
        kind: "descriptions",
        label: "Toto",
        language: "swa",
        enabled: true,
      },
      {
        id: "id2",
        kind: "normal",
        label: "Titi",
        language: "fre",
        enabled: false,
      },
      {
        id: "id26",
        kind: "bloop",
        label: "hay",
        language: "hay",
        enabled: false,
      },
    ];
    Object.defineProperty(fakeAudioTracks[0], "enabled", {
      enumerable: true,
      get(): boolean {
        return track1IsEnabled;
      },
      set(enabled: boolean) {
        if (!enabled) {
          track1WasDisabled++;
        } else {
          track1WasEnabled++;
        }
        track1IsEnabled = enabled;
      },
    });
    Object.defineProperty(fakeAudioTracks[1], "enabled", {
      enumerable: true,
      get(): boolean {
        return track2IsEnabled;
      },
      set(enabled: boolean) {
        if (!enabled) {
          track2WasDisabled++;
        } else {
          track2WasEnabled++;
        }
        track2IsEnabled = enabled;
      },
    });
    Object.defineProperty(fakeAudioTracks[2], "enabled", {
      enumerable: true,
      get(): boolean {
        return track3IsEnabled;
      },
      set(enabled: boolean) {
        if (!enabled) {
          track3WasDisabled++;
        } else {
          track3WasEnabled++;
        }
        track3IsEnabled = enabled;
      },
    });
    const enableAudioTrack = (await vi.importActual("../enable_audio_track"))
      .default as typeof IEnableAudioTrack;
    expect(enableAudioTrack(fakeAudioTracks, 1)).toBe(true);
    expect(fakeAudioTracks[0].enabled).toBe(false);
    expect(fakeAudioTracks[1].enabled).toBe(true);
    expect(fakeAudioTracks[2].enabled).toBe(false);
    expect(track1IsEnabled).toBe(false);
    expect(track2IsEnabled).toBe(true);
    expect(track3IsEnabled).toBe(false);
    expect(track1WasDisabled).toBe(1);
    expect(track2WasDisabled).toBe(1);
    expect(track3WasDisabled).toBe(1);
    expect(track1WasEnabled).toBe(0);
    expect(track2WasEnabled).toBe(1);
    expect(track3WasEnabled).toBe(0);
  });

  it("should first disable all audioTracks except the one wanted by default on Tizen", async () => {
    vi.doMock("../browser_detection", () => {
      return {
        isTizen: true,
      };
    });
    let track1IsEnabled = true;
    let track2IsEnabled = false;
    let track3IsEnabled = false;
    let track1WasDisabled = 0;
    let track2WasDisabled = 0;
    let track3WasDisabled = 0;
    let track1WasEnabled = 0;
    let track2WasEnabled = 0;
    let track3WasEnabled = 0;
    const fakeAudioTracks = [
      {
        id: "id1",
        kind: "descriptions",
        label: "Toto",
        language: "swa",
        enabled: true,
      },
      {
        id: "id2",
        kind: "normal",
        label: "Titi",
        language: "fre",
        enabled: false,
      },
      {
        id: "id26",
        kind: "bloop",
        label: "hay",
        language: "hay",
        enabled: false,
      },
    ];
    Object.defineProperty(fakeAudioTracks[0], "enabled", {
      enumerable: true,
      get(): boolean {
        return track1IsEnabled;
      },
      set(enabled: boolean) {
        if (!enabled) {
          track1WasDisabled++;
        } else {
          track1WasEnabled++;
        }
        track1IsEnabled = enabled;
      },
    });
    Object.defineProperty(fakeAudioTracks[1], "enabled", {
      enumerable: true,
      get(): boolean {
        return track2IsEnabled;
      },
      set(enabled: boolean) {
        if (!enabled) {
          track2WasDisabled++;
        } else {
          track2WasEnabled++;
        }
        track2IsEnabled = enabled;
      },
    });
    Object.defineProperty(fakeAudioTracks[2], "enabled", {
      enumerable: true,
      get(): boolean {
        return track3IsEnabled;
      },
      set(enabled: boolean) {
        if (!enabled) {
          track3WasDisabled++;
        } else {
          track3WasEnabled++;
        }
        track3IsEnabled = enabled;
      },
    });
    const enableAudioTrack = (await vi.importActual("../enable_audio_track"))
      .default as typeof IEnableAudioTrack;
    expect(enableAudioTrack(fakeAudioTracks, 1)).toBe(true);
    expect(fakeAudioTracks[0].enabled).toBe(false);
    expect(fakeAudioTracks[1].enabled).toBe(true);
    expect(fakeAudioTracks[2].enabled).toBe(false);
    expect(track1IsEnabled).toBe(false);
    expect(track2IsEnabled).toBe(true);
    expect(track3IsEnabled).toBe(false);
    expect(track1WasDisabled).toBe(1);
    expect(track2WasDisabled).toBe(0);
    expect(track3WasDisabled).toBe(1);
    expect(track1WasEnabled).toBe(0);
    expect(track2WasEnabled).toBe(1);
    expect(track3WasEnabled).toBe(0);
  });
});
