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

/* tslint:disable no-unsafe-any */
describe("Compat - isVTTCue", () => {
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

  it("should return true if the given cue is an instance of a vtt cue", () => {
    const originalVTTCue = (window as any).VTTCue;
    (window as any).VTTCue = MockVTTCue;
    const cue = new VTTCue(0, 10, "");
    const isVTTCue = require("../is_vtt_cue").default;
    expect(isVTTCue(cue)).toEqual(true);
    (window as any).VTTCue = originalVTTCue;
  });

  it("should return false if the given cue is not an instance of a vtt cue", () => {
    const originalVTTCue = (window as any).VTTCue;
    (window as any).VTTCue = MockVTTCue;
    const cue = {
      startTime: 0,
      endTime: 10,
      text: "toto",
    };
    const isVTTCue = require("../is_vtt_cue").default;
    expect(isVTTCue(cue)).toEqual(false);
    (window as any).VTTCue = originalVTTCue;
  });

  it("should return false in any case if window does not define a VTTCue", () => {
    const originalVTTCue = (window as any).VTTCue;
    (window as any).VTTCue = MockVTTCue;
    const cue = new VTTCue(0, 10, "");
    (window as any).VTTCue = undefined;
    const isVTTCue = require("../is_vtt_cue").default;
    expect(isVTTCue(cue)).toEqual(false);
    (window as any).VTTCue = originalVTTCue;
  });
});
/* tslint:enable no-unsafe-any */
