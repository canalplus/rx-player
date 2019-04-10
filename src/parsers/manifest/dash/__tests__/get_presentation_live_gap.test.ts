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

describe("DASH Parser - getPresentationLiveGap", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return 0 if clockOffset is set without a lastTimeReference", () => {
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({
      __esModule: true,
      default: { warn: warnSpy },
    }));

    const getPresentationLiveGap = require("../get_presentation_live_gap").default;

    const falseManifest1 = {
      id: "tot",
      isLive: false,
      periods: [],
      transportType: "dash",
      clockOffset: 1,
    };
    const falseManifest2 = {
      id: "tot",
      isLive: false,
      periods: [],
      transportType: "dash",
      clockOffset: 0,
      availabilityStartTime: 120,
    };

    expect(getPresentationLiveGap(falseManifest1)).toEqual(0);
    expect(getPresentationLiveGap(falseManifest2)).toEqual(0);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("should calculate relatively to the last time reference", () => {
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({
      __esModule: true,
      default: { warn: warnSpy },
    }));

    const dateSpy = jest.spyOn(Date, "now").mockReturnValue(30000); // 30s
    const getPresentationLiveGap = require("../get_presentation_live_gap").default;

    const falseManifest = {
      id: "tot",
      isLive: false,
      periods: [],
      transportType: "dash",
    };

    expect(getPresentationLiveGap(falseManifest, 15)).toEqual(30 - 15);
    expect(warnSpy).not.toHaveBeenCalled();
    dateSpy.mockRestore();
  });

  it("should consider the clockOffset when the last time reference is set", () => {
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({
      __esModule: true,
      default: { warn: warnSpy },
    }));

    const dateSpy = jest.spyOn(Date, "now").mockReturnValue(30000); // 30s
    const getPresentationLiveGap = require("../get_presentation_live_gap").default;

    const falseManifest = {
      id: "tot",
      isLive: false,
      periods: [],
      transportType: "dash",
      clockOffset: 4000,
    };

    expect(getPresentationLiveGap(falseManifest, 15)).toEqual(30 - 4 - 15);
    expect(warnSpy).not.toHaveBeenCalled();
    dateSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should consider the availabilityStartTime when the last time reference is set", () => {
  /* tslint:enable max-line-length */
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({
      __esModule: true,
      default: { warn: warnSpy },
    }));

    const dateSpy = jest.spyOn(Date, "now").mockReturnValue(30000); // 30s
    const getPresentationLiveGap = require("../get_presentation_live_gap").default;

    const falseManifest = {
      id: "tot",
      isLive: false,
      periods: [],
      transportType: "dash",
      availabilityStartTime: 9,
    };

    expect(getPresentationLiveGap(falseManifest, 15)).toEqual(30 - 15 - 9);
    expect(warnSpy).not.toHaveBeenCalled();
    dateSpy.mockRestore();
  });

  /* tslint:disable max-line-length */
  it("should consider both the availabilityStartTime and the clockOffset when the last time reference is set", () => {
  /* tslint:enable max-line-length */
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({
      __esModule: true,
      default: { warn: warnSpy },
    }));

    const dateSpy = jest.spyOn(Date, "now").mockReturnValue(30000); // 30s
    const getPresentationLiveGap = require("../get_presentation_live_gap").default;

    const falseManifest = {
      id: "tot",
      isLive: false,
      periods: [],
      transportType: "dash",
      clockOffset: 4000,
      availabilityStartTime: 9,
    };

    expect(getPresentationLiveGap(falseManifest, 15)).toEqual(30 - 4 - 15 - 9);
    expect(warnSpy).not.toHaveBeenCalled();
    dateSpy.mockRestore();
  });

  it("should calculate relatively to the last time reference", () => {
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({
      __esModule: true,
      default: { warn: warnSpy },
    }));

    const dateSpy = jest.spyOn(Date, "now").mockReturnValue(30000); // 30s
    const getPresentationLiveGap = require("../get_presentation_live_gap").default;

    const falseManifest = {
      id: "tot",
      isLive: false,
      periods: [],
      transportType: "dash",
    };

    expect(getPresentationLiveGap(falseManifest, 15)).toEqual(30 - 15);
    expect(warnSpy).not.toHaveBeenCalled();
    dateSpy.mockRestore();
  });

  it("should return 10 and warn by default", () => {
    const warnSpy = jest.fn();
    jest.mock("../../../../log", () => ({
      __esModule: true,
      default: { warn: warnSpy },
    }));
    const getPresentationLiveGap = require("../get_presentation_live_gap").default;

    const falseManifest = {
      id: "tot",
      isLive: false,
      periods: [],
      transportType: "dash",
    };

    expect(getPresentationLiveGap(falseManifest)).toEqual(10);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy)
      .toHaveBeenCalledWith("DASH Parser: no clock synchronization mechanism found." +
      "Setting a live gap of 10 seconds as a security.");
  });
});
