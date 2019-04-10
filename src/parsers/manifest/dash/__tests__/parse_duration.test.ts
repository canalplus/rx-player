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

import parseDuration from "../parse_duration";

describe("parseDuration", function() {
  it("should return a duration if already available", () => {
    expect(parseDuration({ duration: 10 }, [])).toEqual(10);
    expect(parseDuration({ duration: 0 }, [])).toEqual(0);

    expect(parseDuration({
      duration: 10,
      type: "static",
    }, [])).toEqual(10);
    expect(parseDuration({
      duration: 10,
      type: "dynamic",
    }, [])).toEqual(10);
    expect(parseDuration(
      { duration: 12 },
      [{ id: "a", start: 0, end: 150, adaptations: {} }]
    )).toEqual(12);
  });

  it("should return undefined if we are in a dynamic content without duration", () => {
    expect(parseDuration({ type: "dynamic" }, [])).toEqual(undefined);
    expect(parseDuration(
      { type: "dynamic" },
      [{ id: "a", start: 0, end: 150, adaptations: {} }]
    )).toEqual(undefined);
  });

  it("should return undefined for non-dynamic contents without periods", () => {
    expect(parseDuration({ type: "static" }, [])).toEqual(undefined);
    expect(parseDuration({}, [])).toEqual(undefined);
  });

  /* tslint:disable:max-line-length */
  it("should return the end of the last period it it exists for non-dynamic contents", () => {
  /* tslint:enable:max-line-length */

    // With `period.end`
    expect(parseDuration(
      { type: "static" },
      [{ id: "a", start: 0, end: 150, adaptations: {} }]
    )).toEqual(150);
    expect(parseDuration(
      {},
      [{ id: "a", start: 0, end: 150, adaptations: {} }]
    )).toEqual(150);

    expect(parseDuration(
      { type: "static" },
      [
        { id: "a", start: 0, end: 150, adaptations: {} },
        { id: "b", start: 190, end: 350, adaptations: {} },
      ]
    )).toEqual(350);

    // With `period.duration`
    expect(parseDuration(
      { type: "static" },
      [{ id: "a", start: 0, duration: 150, adaptations: {} }]
    )).toEqual(150);
    expect(parseDuration(
      {},
      [{ id: "a", start: 0, duration: 150, adaptations: {} }]
    )).toEqual(150);

    expect(parseDuration(
      { type: "static" },
      [
        { id: "a", start: 0, end: 150, adaptations: {} },
        { id: "b", start: 190, duration: 10, adaptations: {} },
      ]
    )).toEqual(200);
  });
});
