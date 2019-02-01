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

import isActiveCue from "../is_active_cue";

describe("compat - isActiveCue", () => {
  it("should find cue into active cues", () => {
    const cueToTest = {
      id: "1",
      startTime: 0,
      endTime: 2,
      text: "Who are you ?",
    };
    const fakeActiveCues = [ cueToTest ];
    expect(isActiveCue(fakeActiveCues as any, cueToTest as any)).toBe(true);
  });

  it("should not find cue into active cues", () => {
    const cueToTest = {
      id: "1",
      startTime: 0,
      endTime: 2,
      text: "Who are you ?",
    };
    const fakeActiveCues = [{
      id: "2",
      startTime: 3,
      endTime: 5,
      text: "I'am Pierre-Paul Jacques...",
    }];
    expect(isActiveCue(fakeActiveCues as any, cueToTest as any)).toBe(false);
  });
});
