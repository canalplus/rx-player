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

import { MediaError } from "../../errors";
// import Adaptation from "../adaptation";
import Period from "../period";

/* define generic group of Representations */
const minimalRepresentationIndex = {
  getInitSegment() { return null; },
  getSegments() { return []; },
  shouldRefresh() { return false; },
  getFirstPosition() : undefined { return ; },
  getLastPosition() : undefined { return ; },
  checkDiscontinuity() { return -1; },
  _update() { /* noop */ },
  _addSegments() { /* noop */ },
};
const rep1 = { bitrate: 10, id: "rep1", index: minimalRepresentationIndex };
const rep2 = { bitrate: 20, id: "rep2", index: minimalRepresentationIndex };
const rep3 = { bitrate: 30, id: "rep3", index: minimalRepresentationIndex };
const rep4 = { bitrate: 40, id: "rep4", index: minimalRepresentationIndex };
const rep5 = { bitrate: 50, id: "rep5", index: minimalRepresentationIndex };
const rep6 = { bitrate: 60, id: "rep6", index: minimalRepresentationIndex };
const representations = [rep1, rep2, rep3, rep4, rep5, rep6];

describe("manifest - Period", () => {
  it("should throw if no adaptation is given", () => {
    const args = { id: "12", adaptations: {}, start: 0 };
    let period : Period|null = null;
    let errorReceived = null;
    try {
      period = new Period(args);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived.code).toBe("MANIFEST_PARSE_ERROR");
    expect(errorReceived.message).toContain("No supported audio and video tracks.");
    expect(errorReceived).toBeInstanceOf(MediaError);
  });

  it("should throw if no audio nor video adaptation is given", () => {
    const text = [{ type: "text" as "text", id: "54", representations }];
    const args = { id: "12", adaptations: { text }, start: 0 };
    let period : Period|null = null;
    let errorReceived = null;
    try {
      period = new Period(args);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived.code).toBe("MANIFEST_PARSE_ERROR");
    expect(errorReceived.message).toContain("No supported audio and video tracks.");
    expect(errorReceived).toBeInstanceOf(MediaError);
  });

  // TODO Mock Adaptaptation
});
