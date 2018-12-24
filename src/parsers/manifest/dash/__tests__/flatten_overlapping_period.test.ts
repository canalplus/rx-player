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

import { expect } from "chai";
import flattenOverlappingPeriods from "../flatten_overlapping_periods";

describe("flattenOverlappingPeriods", function() {
  // [ Period 1 ][ Period 2 ]       ------>  [ Period 1 ][ Period 3 ]
  //             [ Period 3 ]
  it("flatten periods - case 1", function() {
    const periods = [
      { id: "1", start: 0, duration: 60, adaptations: {} },
      { id: "2", start: 60, duration: 60, adaptations: {} },
      { id: "3", start: 60, duration: 60, adaptations: {} },
    ];

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).to.be.equal(2);
    expect(flattenPeriods[0].start).to.be.equal(0);
    expect(flattenPeriods[0].duration).to.be.equal(60);
    expect(flattenPeriods[0].id).to.be.equal("1");
    expect(flattenPeriods[1].start).to.be.equal(60);
    expect(flattenPeriods[1].duration).to.be.equal(60);
    expect(flattenPeriods[1].id).to.be.equal("3");
  });

  // [ Period 1 ][ Period 2 ]       ------>  [ Period 1 ][  2  ][ Period 3 ]
  //                  [ Period 3 ]
  it("flatten periods - case 2", function() {
    const periods = [
      { id: "1", start: 0, duration: 60, adaptations: {} },
      { id: "2", start: 60, duration: 60, adaptations: {} },
      { id: "3", start: 90, duration: 60, adaptations: {} },
    ];

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).to.be.equal(3);
    expect(flattenPeriods[0].start).to.be.equal(0);
    expect(flattenPeriods[0].duration).to.be.equal(60);
    expect(flattenPeriods[0].id).to.be.equal("1");
    expect(flattenPeriods[1].start).to.be.equal(60);
    expect(flattenPeriods[1].duration).to.be.equal(30);
    expect(flattenPeriods[1].id).to.be.equal("2");
    expect(flattenPeriods[2].start).to.be.equal(90);
    expect(flattenPeriods[2].duration).to.be.equal(60);
    expect(flattenPeriods[2].id).to.be.equal("3");
  });

  // [ Period 1 ][ Period 2 ]       ------>  [  1  ][      Period 3     ]
  //        [      Period 3     ]
  it("flatten periods - case 3", function() {
    const periods = [
      { id: "1", start: 0, duration: 60, adaptations: {} },
      { id: "2", start: 60, duration: 60, adaptations: {} },
      { id: "3", start: 50, duration: 120, adaptations: {} },
    ];

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).to.be.equal(2);
    expect(flattenPeriods[0].start).to.be.equal(0);
    expect(flattenPeriods[0].duration).to.be.equal(50);
    expect(flattenPeriods[0].id).to.be.equal("1");
    expect(flattenPeriods[1].start).to.be.equal(50);
    expect(flattenPeriods[1].duration).to.be.equal(120);
    expect(flattenPeriods[1].id).to.be.equal("3");
  });

  // [ Period 1 ][ Period 2 ]       ------>  [  1  ][  100   ]
  //             [ Period 3 ]
  //                  ...
  //             [   100    ]
  it("flatten periods - case 4", function() {
    const periods = [
      { id: "1", start: 0, duration: 60, adaptations: {} },
    ];

    for (let i = 1; i <= 100; i++) {
      periods.push({ id: i.toString(), start: 60, duration: 60, adaptations: {} });
    }

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).to.be.equal(2);
    expect(flattenPeriods[0].start).to.be.equal(0);
    expect(flattenPeriods[0].duration).to.be.equal(60);
    expect(flattenPeriods[0].id).to.be.equal("1");
    expect(flattenPeriods[1].start).to.be.equal(60);
    expect(flattenPeriods[1].duration).to.be.equal(60);
    expect(flattenPeriods[1].id).to.be.equal("100");
  });
});
