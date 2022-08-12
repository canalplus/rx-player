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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("Compat - isVTTCue", () => {
  interface IFakeWindow {
    VTTCue? : VTTCue | typeof MockVTTCue;
  }
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
  const win = window as IFakeWindow;

  it("should return true if the given cue is an instance of a vtt cue", () => {
    const originalVTTCue = window.VTTCue;
    win.VTTCue = MockVTTCue;
    const cue = new VTTCue(0, 10, "");
    const isVTTCue = jest.requireActual("../is_vtt_cue").default;
    expect(isVTTCue(cue)).toEqual(true);
    window.VTTCue = originalVTTCue;
  });

  it("should return false if the given cue is not an instance of a vtt cue", () => {
    const originalVTTCue = window.VTTCue;
    win.VTTCue = MockVTTCue;
    const cue = {
      startTime: 0,
      endTime: 10,
      text: "toto",
    };
    const isVTTCue = jest.requireActual("../is_vtt_cue").default;
    expect(isVTTCue(cue)).toEqual(false);
    window.VTTCue = originalVTTCue;
  });

  it("should return false in any case if window does not define a VTTCue", () => {
    const originalVTTCue = window.VTTCue;
    win.VTTCue = MockVTTCue;
    const cue = new VTTCue(0, 10, "");
    delete win.VTTCue;
    const isVTTCue = jest.requireActual("../is_vtt_cue").default;
    expect(isVTTCue(cue)).toEqual(false);
    window.VTTCue = originalVTTCue;
  });
});
