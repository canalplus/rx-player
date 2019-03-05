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

describe("Compat - makeVTTCue", () => {
  class MockVTTCue {
    public startTime : number;
    public endTime : number;
    public text : string;
    constructor(start : number, end : number, text : string) {
      this.startTime = start;
      this.endTime = end;
      this.text = text;
    }
  }

  beforeEach(() => {
    jest.resetModules();
  });

  it("should throw if VTTCue are not available", () => {
    const logSpy = { warn: jest.fn() };
    jest.mock("../browser_compatibility_types", () => ({
      __esModule: true,
      VTTCue_: undefined,
    }));
    jest.mock("../../log", () => ({
      __esModule: true,
      default: logSpy,
    }));
    const makeCue = require("../make_vtt_cue").default;
    let result;
    let error : Error|undefined;
    try {
      result = makeCue(5, 10, "toto");
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toEqual("VTT cues not supported in your target");
    expect(result).toBe(undefined);
    expect(logSpy.warn).not.toHaveBeenCalled();
  });

  it("should warn and not create anything if start time is after end time", () => {
    const logSpy = { warn: jest.fn() };
    jest.mock("../browser_compatibility_types", () => ({
      __esModule: true,
      VTTCue_: MockVTTCue,
    }));
    jest.mock("../../log", () => ({
      __esModule: true,
      default: logSpy,
    }));
    const makeCue = require("../make_vtt_cue").default;
    const result = makeCue(12, 10, "toto");
    expect(result).toBeNull();
    expect(logSpy.warn).toHaveBeenCalledTimes(1);
    expect(logSpy.warn).toHaveBeenCalledWith("Compat: Invalid cue times: 12 - 10");
  });

  it("should create a new VTT Cue in other cases", () => {
    const logSpy = { warn: jest.fn() };
    jest.mock("../browser_compatibility_types", () => ({
      __esModule: true,
      VTTCue_: MockVTTCue,
    }));
    jest.mock("../../log", () => ({
      __esModule: true,
      default: logSpy,
    }));
    const makeCue = require("../make_vtt_cue").default;
    const result = makeCue(10, 12, "toto");
    expect(result).toEqual(new MockVTTCue(10, 12, "toto"));
    expect(logSpy.warn).not.toHaveBeenCalled();
  });
});
