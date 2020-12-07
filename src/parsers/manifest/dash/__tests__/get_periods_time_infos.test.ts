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

import getPeriodsTimeInformation from "../get_periods_time_infos";

describe("DASH Parser - getPeriodsTimeInformation", () => {
  it("should guess duration and end from next period.", () => {
    const periodsInfos = [
      { attributes: { start: 0 } },
      { attributes: { start: 10 } },
    ];
    const timeInfos = getPeriodsTimeInformation(periodsInfos as any, {} as any);
    expect(timeInfos[0].periodDuration).toBe(10);
    expect(timeInfos[0].periodEnd).toBe(10);
    expect(timeInfos[1].periodDuration).toBe(undefined);
    expect(timeInfos[1].periodEnd).toBe(undefined);
  });

  it("should guess start from previous period end", () => {
    const periodsInfos = [
      { attributes: { start: 0, duration: 10 } },
      { attributes: { duration: 10 } },
    ];
    const timeInfos = getPeriodsTimeInformation(periodsInfos as any, {} as any);
    expect(timeInfos[0].periodEnd).toBe(10);
    expect(timeInfos[1].periodStart).toBe(10);
    expect(timeInfos[1].periodEnd).toBe(20);
  });

  it("should return periods time infos corresponding to inputs", () => {
    const periodsInfos = [
      { attributes: { start: 0, duration: 5 } },
      { attributes: { start: 5, duration: 10 } },
    ];
    const timeInfos = getPeriodsTimeInformation(periodsInfos as any, {} as any);
    expect(timeInfos[0].periodStart).toEqual(periodsInfos[0].attributes.start);
    expect(timeInfos[0].periodDuration).toEqual(periodsInfos[0].attributes.duration);
    expect(timeInfos[1].periodStart).toEqual(periodsInfos[1].attributes.start);
    expect(timeInfos[1].periodDuration).toEqual(periodsInfos[1].attributes.duration);
  });

  it("should infer duration from manifest infos", () => {
    const periodsInfos = [
      { attributes: { start: 0 } },
    ];
    const manifestInfos = {
      duration: 20,
    };
    const timeInfos =
      getPeriodsTimeInformation(periodsInfos as any, manifestInfos as any);
    expect(timeInfos[0].periodDuration).toEqual(manifestInfos.duration);
  });

  it("should infer start from availability start time", () => {
    const periodsInfos = [
      { attributes: { duration: 10 } },
    ];
    const manifestInfos = {
      isDynamic: true,
      availabilityStartTime: 500,
    };
    const timeInfos =
      getPeriodsTimeInformation(periodsInfos as any, manifestInfos as any);
    expect(timeInfos[0].periodStart).toBe(500);
    expect(timeInfos[0].periodDuration).toBe(10);
    expect(timeInfos[0].periodEnd).toBe(510);
  });

  it("should infer start from non-static manifest", () => {
    const periodsInfos = [
      { attributes: { duration: 10 } },
    ];
    const manifestInfos = {
      isDynamic: false,
    };
    const timeInfos =
      getPeriodsTimeInformation(periodsInfos as any, manifestInfos as any);
    expect(timeInfos[0].periodStart).toBe(0);
    expect(timeInfos[0].periodDuration).toBe(10);
    expect(timeInfos[0].periodEnd).toBe(10);
  });
});
