/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import arrayFindIndex from "../../utils/array_find_index";

describe("compat - removeCue", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should remove cue from track if not on firefox", () => {
    const fakeTrackCues = [{ id: "1" }];
    const mockSanelyRemoveCue = jest.fn((cue: { id: string }) => {
      const idx = arrayFindIndex(fakeTrackCues, (c) => {
        return c.id === cue.id;
      });
      if (idx >= 0) {
        fakeTrackCues.splice(idx, 1);
      }
    });

    const mockGetMode = jest.fn(() => "showing");
    const mockSetMode = jest.fn(() => null);

    const fakeTrack = {
      get mode() { return mockGetMode(); },
      set mode(_) { mockSetMode(); },
      cues: fakeTrackCues,
      removeCue: mockSanelyRemoveCue,
    };

    jest.mock("../browser_detection", () => ({
      isFirefox: false,
    }));
    const removeCue = require("../remove_cue").default;
    removeCue(fakeTrack as any, { id: "1" } as any);

    expect(fakeTrack.cues.length).toBe(0);
    expect(mockSanelyRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockGetMode).not.toHaveBeenCalled();
    expect(mockSetMode).not.toHaveBeenCalled();
    expect(fakeTrack.mode).toBe("showing");
    expect(mockSanelyRemoveCue).toHaveBeenLastCalledWith({ id: "1" });
  });

  it("should remove cue from track if on firefox", () => {
    const fakeTrackCues = [{ id: "1" }];
    const mockSanelyRemoveCue = jest.fn((cue: { id: string }) => {
      const idx = arrayFindIndex(fakeTrackCues, (c) => {
        return c.id === cue.id;
      });
      if (idx >= 0) {
        fakeTrackCues.splice(idx, 1);
      }
    });

    let fakeMode = "showing";
    const mockGetMode = jest.fn(() => {
      return fakeMode;
    });
    const mockSetMode = jest.fn((newMode: string) => {
      fakeMode = newMode;
    });

    const fakeTrack = {
      get mode() { return mockGetMode(); },
      set mode(newMode: string) { mockSetMode(newMode); },
      cues: fakeTrackCues,
      removeCue: mockSanelyRemoveCue,
    };

    jest.mock("../browser_detection", () => ({
      isFirefox: true,
    }));

    const removeCue = require("../remove_cue").default;
    removeCue(fakeTrack as any, { id: "1" } as any);

    expect(fakeTrack.cues.length).toBe(0);
    expect(mockSanelyRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockGetMode).toHaveBeenCalledTimes(1);
    expect(mockSetMode).toHaveBeenCalledTimes(2);
    expect(fakeTrack.mode).toBe("showing");
    expect(mockSanelyRemoveCue).toHaveBeenLastCalledWith({ id: "1" });
  });

  it("should log if removeCue throws if on firefox", () => {
    const mockSanelyRemoveCue = jest.fn(() => {
      throw new Error();
    });

    const fakeTrack = {
      mode: "showing",
      cues: [
        { id: "1" },
      ],
      removeCue: mockSanelyRemoveCue,
    };

    const mockLog = jest.fn((message) => message);

    jest.mock("../browser_detection", () => ({
      isFirefox: true,
    }));
    jest.mock("../../log", () => ({
      default: {
        warn: mockLog,
      },
    }));

    const removeCue = require("../remove_cue").default;
    removeCue(fakeTrack as any, { id: "1" } as any);

    expect(fakeTrack.cues.length).toBe(1);
    expect(fakeTrack.mode).toBe("showing");
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith("Compat: Could not remove cue from text track.");
    expect(mockSanelyRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockSanelyRemoveCue).toHaveBeenLastCalledWith({ id: "1" });
  });

  it("should log if removeCue throws if not on firefox", () => {
    const mockSanelyRemoveCue = jest.fn(() => {
      throw new Error();
    });

    const fakeTrack = {
      mode: "showing",
      cues: [
        { id: "1" },
      ],
      removeCue: mockSanelyRemoveCue,
    };

    const mockLog = jest.fn((message) => message);

    jest.mock("../browser_detection", () => ({
      isFirefox: false,
    }));
    jest.mock("../../log", () => ({
      default: {
        warn: mockLog,
      },
    }));

    const removeCue = require("../remove_cue").default;
    removeCue(fakeTrack as any, { id: "1" } as any);

    expect(fakeTrack.cues.length).toBe(1);
    expect(fakeTrack.mode).toBe("showing");
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith("Compat: Could not remove cue from text track.");
    expect(mockSanelyRemoveCue).toHaveBeenCalledTimes(1);
    expect(mockSanelyRemoveCue).toHaveBeenLastCalledWith({ id: "1" });
  });
});
