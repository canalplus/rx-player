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

import log from "../../../../log";
import { IParsedPeriod } from "../../types";
import flattenOverlappingPeriods from "../flatten_overlapping_periods";

describe("flattenOverlappingPeriods", function() {

  it("should do nothing when no period is given", () => {
    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());

    expect(flattenOverlappingPeriods([])).toEqual([]);
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  // [ Period 1 ][ Period 2 ]       ------>  [ Period 1 ][ Period 3 ]
  //             [ Period 3 ]
  it("should replace a period with an other if same start and duration", function() {
    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());

    const periods : IParsedPeriod[] = [
      { id: "1", url: null, start: 0, duration: 60, isLoaded: true, adaptations: {} },
      { id: "2", url: null, start: 60, duration: 60, isLoaded: true, adaptations: {} },
      { id: "3", url: null, start: 60, duration: 60, isLoaded: true, adaptations: {} },
    ];

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).toBe(2);
    expect(flattenPeriods[0].start).toBe(0);
    expect(flattenPeriods[0].duration).toBe(60);
    expect(flattenPeriods[0].id).toBe("1");
    expect(flattenPeriods[1].start).toBe(60);
    expect(flattenPeriods[1].duration).toBe(60);
    expect(flattenPeriods[1].id).toBe("3");

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      "DASH: Updating overlapping Periods.", periods[1], periods[2]);
    logSpy.mockRestore();
  });

  // [ Period 1 ][ Period 2 ]       ------>  [ Period 1 ][  2  ][ Period 3 ]
  //                  [ Period 3 ]
  it("should replace part of period if part of next one is overlapping it", function() {
    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());

    const periods : IParsedPeriod[] = [
      { id: "1", url: null, start: 0, duration: 60, isLoaded: true, adaptations: {} },
      { id: "2", url: null, start: 60, duration: 60, isLoaded: true, adaptations: {} },
      { id: "3", url: null, start: 90, duration: 60, isLoaded: true, adaptations: {} },
    ];

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).toBe(3);
    expect(flattenPeriods[0].start).toBe(0);
    expect(flattenPeriods[0].duration).toBe(60);
    expect(flattenPeriods[0].id).toBe("1");
    expect(flattenPeriods[1].start).toBe(60);
    expect(flattenPeriods[1].duration).toBe(30);
    expect(flattenPeriods[1].id).toBe("2");
    expect(flattenPeriods[2].start).toBe(90);
    expect(flattenPeriods[2].duration).toBe(60);
    expect(flattenPeriods[2].id).toBe("3");

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      "DASH: Updating overlapping Periods.", periods[1], periods[2]);
    logSpy.mockRestore();
  });

  // [ Period 1 ][ Period 2 ]       ------>  [  1  ][      Period 3     ]
  //        [      Period 3     ]
  it("should erase period if a next period starts before and ends after it", function() {
    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());

    const periods : IParsedPeriod[] = [
      { id: "1", url: null, start: 0, duration: 60, isLoaded: true, adaptations: {} },
      { id: "2", url: null, start: 60, duration: 60, isLoaded: true, adaptations: {} },
      { id: "3", url: null, start: 50, duration: 120, isLoaded: true, adaptations: {} },
    ];

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).toBe(2);
    expect(flattenPeriods[0].start).toBe(0);
    expect(flattenPeriods[0].duration).toBe(50);
    expect(flattenPeriods[0].id).toBe("1");
    expect(flattenPeriods[1].start).toBe(50);
    expect(flattenPeriods[1].duration).toBe(120);
    expect(flattenPeriods[1].id).toBe("3");

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(
      "DASH: Updating overlapping Periods.", periods[0], periods[2]);
    expect(logSpy).toHaveBeenCalledWith(
      "DASH: Updating overlapping Periods.", periods[1], periods[2]);
    logSpy.mockRestore();
  });

  // [ Period 1 ][ Period 2 ]       ------>  [  1  ][  100   ]
  //             [ Period 3 ]
  //                  ...
  //             [   100    ]
  /* tslint:disable max-line-length */
  it("should keep last announced period from multiple periods with same start and end", function() {
  /* tslint:enable max-line-length */
    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());

    const periods : IParsedPeriod[] = [
      { id: "1", url: null, start: 0, duration: 60, isLoaded: true, adaptations: {} },
    ];

    for (let i = 1; i <= 100; i++) {
      periods.push({ id: i.toString(),
                     url: null,
                     start: 60,
                     duration: 60,
                     isLoaded: true,
                     adaptations: {} });
    }

    const flattenPeriods = flattenOverlappingPeriods(periods);
    expect(flattenPeriods.length).toBe(2);
    expect(flattenPeriods[0].start).toBe(0);
    expect(flattenPeriods[0].duration).toBe(60);
    expect(flattenPeriods[0].id).toBe("1");
    expect(flattenPeriods[1].start).toBe(60);
    expect(flattenPeriods[1].duration).toBe(60);
    expect(flattenPeriods[1].id).toBe("100");

    expect(logSpy).toHaveBeenCalledTimes(99);
    logSpy.mockRestore();
  });
});
