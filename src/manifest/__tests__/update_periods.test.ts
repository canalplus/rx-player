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

const MANIFEST_UPDATE_TYPE = {
  Full: 0,
  Partial: 1,
};

describe("Manifest - replacePeriods", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  // Case 1 :
  //
  // old periods : p1, p2
  // new periods : p2
  //
  it("should remove old period", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      { id: "p1" },
      { id: "p2" },
    ] as any;
    const newPeriods = [
      { id: "p2" },
    ] as any;
    /* tslint:disable no-unsafe-any */
    const replacePeriods = require("../update_periods").replacePeriods;
    replacePeriods(oldPeriods, newPeriods, MANIFEST_UPDATE_TYPE.Full);
    expect(oldPeriods.length).toBe(1);
    expect(oldPeriods[0].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(1,
                                                            { id: "p2" },
                                                            { id: "p2" },
                                                            0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 2 :
  //
  // old periods : p1
  // new periods : p1, p2
  //
  it("should add new period", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      { id: "p2" },
    ] as any;
    const newPeriods = [
      { id: "p2" },
      { id: "p3" },
    ] as any;
    /* tslint:disable no-unsafe-any */
    const replacePeriods = require("../update_periods").replacePeriods;
    replacePeriods(oldPeriods, newPeriods, MANIFEST_UPDATE_TYPE.Full);
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p2");
    expect(oldPeriods[1].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(1,
                                                            { id: "p2" },
                                                            { id: "p2" },
                                                            0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 3 :
  //
  // old periods: p1
  // new periods: p2
  //
  it("should replace period", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      { id: "p1" },
    ] as any;
    const newPeriods = [
      { id: "p2" },
    ] as any;
    /* tslint:disable no-unsafe-any */
    const replacePeriods = require("../update_periods").replacePeriods;
    replacePeriods(oldPeriods, newPeriods, MANIFEST_UPDATE_TYPE.Full);
    expect(oldPeriods.length).toBe(1);
    expect(oldPeriods[0].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 4 :
  //
  // old periods: p0, p1, p2
  // new periods: p1, a, b, p2, p3
  //
  it("should handle more complex period replacement", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      { id: "p0" },
      { id: "p1" },
      { id: "p2", start: 0 },
    ] as any;
    const newPeriods = [
      { id: "p1" },
      { id: "a" },
      { id: "b" },
      { id: "p2", start: 2 },
      { id: "p3" },
    ] as any;
    /* tslint:disable no-unsafe-any */
    const replacePeriods = require("../update_periods").replacePeriods;
    replacePeriods(oldPeriods, newPeriods, MANIFEST_UPDATE_TYPE.Full);
    expect(oldPeriods.length).toBe(5);

    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("a");
    expect(oldPeriods[2].id).toBe("b");
    expect(oldPeriods[3].id).toBe("p2");
    expect(oldPeriods[4].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(1,
                                                            { id: "p1" },
                                                            { id: "p1" },
                                                            0);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(2,
                                                            { id: "p2", start: 0 },
                                                            { id: "p2", start: 2 },
                                                            0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 5 :
  //
  // old periods : p2
  // new periods : p1, p2
  //
  it("should add new period before", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      { id: "p2" },
    ] as any;
    const newPeriods = [
      { id: "p1" },
      { id: "p2" },
    ] as any;
    /* tslint:disable no-unsafe-any */
    const replacePeriods = require("../update_periods").replacePeriods;
    replacePeriods(oldPeriods, newPeriods, MANIFEST_UPDATE_TYPE.Full);
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(1,
                                                            { id: "p2" },
                                                            { id: "p2" },
                                                            0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 6 :
  //
  // old periods : p1, p2
  // new periods : No periods
  //
  it("should remove all periods", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      { id: "p1" },
      { id: "p2" },
    ] as any;
    const newPeriods = [] as any;
    /* tslint:disable no-unsafe-any */
    const replacePeriods = require("../update_periods").replacePeriods;
    replacePeriods(oldPeriods, newPeriods, MANIFEST_UPDATE_TYPE.Full);
    expect(oldPeriods.length).toBe(0);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 7 :
  //
  // old periods : No periods
  // new periods : p1, p2
  //
  it("should add all periods to empty array", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [] as any;
    const newPeriods = [
      { id: "p1" },
      { id: "p2" },
    ] as any;
    /* tslint:disable no-unsafe-any */
    const replacePeriods = require("../update_periods").replacePeriods;
    replacePeriods(oldPeriods, newPeriods, MANIFEST_UPDATE_TYPE.Full);
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });
});
