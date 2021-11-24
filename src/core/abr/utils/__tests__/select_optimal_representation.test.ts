/**
 * Copyright 2017 CANAL+ Group
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

import { Representation } from "../../../../manifest";
import selectOptimalRepresentation from "../select_optimal_representation";

describe("ABR - selectOptimalRepresentation", () => {
  const fakeReps = [
    { bitrate : 100 },
    { bitrate : 1000 },
    { bitrate : 10000 },
    { bitrate : 100000 },
  ];

  // eslint-disable-next-line max-len
  it("should return the best representation when the optimal bitrate given is Infinity and no higher limit exists", () => {
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       Infinity,
                                       0,
                                       Infinity))
      .toBe(fakeReps[fakeReps.length - 1]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       Infinity,
                                       100,
                                       Infinity))
      .toBe(fakeReps[fakeReps.length - 1]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       Infinity,
                                       Infinity,
                                       Infinity))
      .toBe(fakeReps[fakeReps.length - 1]);
  });

  // eslint-disable-next-line max-len
  it("should return the best representation when both the optimal bitrate and the higher limit given are higher or equal than the highest Representation", () => {
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       100000,
                                       0,
                                       100000))
      .toBe(fakeReps[fakeReps.length - 1]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       100000,
                                       0,
                                       900000))
      .toBe(fakeReps[fakeReps.length - 1]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       900000,
                                       0,
                                       100000))
      .toBe(fakeReps[fakeReps.length - 1]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       900000,
                                       0,
                                       900000))
      .toBe(fakeReps[fakeReps.length - 1]);
  });

  // eslint-disable-next-line max-len
  it("should return one below or equal to the maximum bitrate even if optimal is superior", () => {
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       Infinity,
                                       0,
                                       999))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       Infinity,
                                       0,
                                       100))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       1001,
                                       0,
                                       999))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       1001,
                                       0,
                                       1000))
      .toBe(fakeReps[1]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       Infinity,
                                       0,
                                       9999))
      .toBe(fakeReps[1]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       1001,
                                       0,
                                       1000))
      .toBe(fakeReps[1]);
  });

  // eslint-disable-next-line max-len
  it("should chose the minimum if no Representation is below or equal to the maximum bitrate", () => {
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       1,
                                       0,
                                       0))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       101,
                                       0,
                                       0))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       Infinity,
                                       0,
                                       0))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       Infinity,
                                       0,
                                       99))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       0,
                                       0,
                                       99))
      .toBe(fakeReps[0]);
  });

  // eslint-disable-next-line max-len
  it("should return the worst representation when the optimal bitrate given is 0 and no lower limit exists", () => {
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       0,
                                       0,
                                       Infinity))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       0,
                                       0,
                                       0))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       0,
                                       0,
                                       1000))
      .toBe(fakeReps[0]);
  });

  // eslint-disable-next-line max-len
  it("should return the worst representation when both the optimal bitrate and the lower limit given are lower or equal than the lowest Representation", () => {
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       4,
                                       0,
                                       Infinity))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       100,
                                       100,
                                       Infinity))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       0,
                                       100,
                                       100000))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       100,
                                       0,
                                       100000))
      .toBe(fakeReps[0]);
  });

  // eslint-disable-next-line max-len
  it("should return one higher or equal to the minimum bitrate even if optimal is inferior", () => {
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       0,
                                       1000,
                                       Infinity))
      .toBe(fakeReps[1]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       0,
                                       1000,
                                       1000))
      .toBe(fakeReps[1]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       1000,
                                       10000,
                                       Infinity))
      .toBe(fakeReps[2]);
  });

  // eslint-disable-next-line max-len
  it("should chose the maximum if no Representation is higher or equal to the minimum bitrate", () => {
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       0,
                                       10000000,
                                       Infinity))
      .toBe(fakeReps[fakeReps.length - 1]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       0,
                                       Infinity,
                                       Infinity))
      .toBe(fakeReps[fakeReps.length - 1]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       100,
                                       Infinity,
                                       Infinity))
      .toBe(fakeReps[fakeReps.length - 1]);
  });

  // eslint-disable-next-line max-len
  it("should chose one respecting either the minimum or maximum when the minimum is higher than the maximum", () => {
    expect([fakeReps[0], fakeReps[fakeReps.length - 1]])
      .toContain(selectOptimalRepresentation(fakeReps as Representation[],
                                             1000,
                                             Infinity,
                                             0));
    expect([fakeReps[0], fakeReps[fakeReps.length - 1]])
      .toContain(selectOptimalRepresentation(fakeReps as Representation[],
                                             0,
                                             Infinity,
                                             0));
    expect([fakeReps[0], fakeReps[fakeReps.length - 1]])
      .toContain(selectOptimalRepresentation(fakeReps as Representation[],
                                             Infinity,
                                             Infinity,
                                             0));
    expect([fakeReps[1], fakeReps[2]])
      .toContain(selectOptimalRepresentation(fakeReps as Representation[],
                                             1000,
                                             10000,
                                             1000));
    expect([fakeReps[1], fakeReps[2]])
      .toContain(selectOptimalRepresentation(fakeReps as Representation[],
                                             10000,
                                             10000,
                                             1000));
  });
});
