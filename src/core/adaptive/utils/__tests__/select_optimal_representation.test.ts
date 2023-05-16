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
  it("should return the best representation when the optimal bitrate given is Infinity", () => {
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       Infinity))
      .toBe(fakeReps[fakeReps.length - 1]);
  });

  // eslint-disable-next-line max-len
  it("should return the best representation when both the optimal bitrate and the higher limit given are higher or equal than the highest Representation", () => {
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       100000))
      .toBe(fakeReps[fakeReps.length - 1]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       900000))
      .toBe(fakeReps[fakeReps.length - 1]);
  });

  // eslint-disable-next-line max-len
  it("should return the worst representation when the optimal bitrate given is 0", () => {
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       0))
      .toBe(fakeReps[0]);
  });

  // eslint-disable-next-line max-len
  it("should return the worst representation when the optimal bitrate is lower or equal than the lowest Representation", () => {
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       4))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       100))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       0))
      .toBe(fakeReps[0]);
    expect(selectOptimalRepresentation(fakeReps as Representation[],
                                       100))
      .toBe(fakeReps[0]);
  });
});
