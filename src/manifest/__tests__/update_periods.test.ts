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
    replacePeriods(oldPeriods, newPeriods);
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
    replacePeriods(oldPeriods, newPeriods);
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
    replacePeriods(oldPeriods, newPeriods);
    expect(oldPeriods.length).toBe(1);
    expect(oldPeriods[0].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 4 :
  //
  // old periods: p0, p1, p2
  // new periods: p1, a, b, p2, p3
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
    replacePeriods(oldPeriods, newPeriods);
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
    replacePeriods(oldPeriods, newPeriods);
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
    replacePeriods(oldPeriods, newPeriods);
    expect(oldPeriods.length).toBe(0);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 7 :
  //
  // old periods : No periods
  // new periods : p1, p2
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
    replacePeriods(oldPeriods, newPeriods);
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });
});

describe("updatePeriods", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  // Case 1 :
  //
  // old periods : p1, p2
  // new periods : p2
  it("should not remove old period", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [ { id: "p1", start: 50, end: 60 },
                         { id: "p2", start: 60 } ] as any;
    const newPeriods = [ { id: "p2", start: 60 } ] as any;

    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;
    updatePeriods(oldPeriods, newPeriods);
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(1,
                                                            { id: "p2", start: 60 },
                                                            { id: "p2", start: 60 },
                                                            MANIFEST_UPDATE_TYPE.Partial);
    /* tslint:enable no-unsafe-any */
  });

  // Case 2 :
  //
  // old periods : p1
  // new periods : p1, p2
  it("should add new period", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [ { id: "p2", start: 60 } ] as any;
    const newPeriods = [ { id: "p2", start: 60, end: 80 },
                         { id: "p3", start: 80 } ] as any;
    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;
    updatePeriods(oldPeriods, newPeriods);
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p2");
    expect(oldPeriods[1].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace)
      .toHaveBeenNthCalledWith(1,
                               { id: "p2", start: 60 },
                               { id: "p2", start: 60, end: 80 },
                               MANIFEST_UPDATE_TYPE.Partial);
    /* tslint:enable no-unsafe-any */
  });

  // Case 3 :
  //
  // old periods: p1
  // new periods: p3
  it("should throw when encountering two distant Periods", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [ { id: "p1", start: 50, end: 60 } ] as any;
    const newPeriods = [ { id: "p3", start: 70, end: 80 } ] as any;
    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;

    let error = null;
    try {
      updatePeriods(oldPeriods, newPeriods);
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error.type).toEqual("MEDIA_ERROR");
    expect(error.code).toEqual("MANIFEST_UPDATE_ERROR");
    expect(error.message).toEqual("MediaError (MANIFEST_UPDATE_ERROR) Cannot perform partial update: not enough data");
    expect(oldPeriods.length).toBe(1);
    expect(oldPeriods[0].id).toBe("p1");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 4 :
  //
  // old periods: p0, p1, p2
  // new periods: p1, a, b, p2, p3
  it("should handle more complex period replacement", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({ __esModule: true,
                                                    default: fakeUpdatePeriodInPlace }));
    const oldPeriods = [ { id: "p0", start: 50, end: 60 },
                         { id: "p1", start: 60, end: 70 },
                         { id: "p2", start: 70 } ] as any;
    const newPeriods = [ { id: "p1", start: 60, end: 65  },
                         { id: "a", start: 65, end: 68  },
                         { id: "b", start: 68, end: 70 },
                         { id: "p2", start: 70, end: 80  },
                         { id: "p3", start: 80 } ] as any;
    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;
    updatePeriods(oldPeriods, newPeriods);
    expect(oldPeriods.length).toBe(6);

    expect(oldPeriods[0].id).toBe("p0");
    expect(oldPeriods[1].id).toBe("p1");
    expect(oldPeriods[2].id).toBe("a");
    expect(oldPeriods[3].id).toBe("b");
    expect(oldPeriods[4].id).toBe("p2");
    expect(oldPeriods[5].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace)
      .toHaveBeenNthCalledWith(1,
                               { id: "p1", start: 60, end: 70 },
                               { id: "p1", start: 60, end: 65  },
                               MANIFEST_UPDATE_TYPE.Partial);
    /* tslint:enable no-unsafe-any */
  });

  // Case 5 :
  //
  // old periods : p2
  // new periods : p1, p2
  it("should throw when the first period is not encountered", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({ __esModule: true,
                                                    default: fakeUpdatePeriodInPlace }));
    const oldPeriods = [ { id: "p2", start: 70 } ] as any;
    const newPeriods = [ { id: "p1", start: 50, end: 70 },
                         { id: "p2", start: 70 } ] as any;

    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;

    let error = null;
    try {
      updatePeriods(oldPeriods, newPeriods);
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error.type).toEqual("MEDIA_ERROR");
    expect(error.code).toEqual("MANIFEST_UPDATE_ERROR");
    expect(error.message).toEqual("MediaError (MANIFEST_UPDATE_ERROR) Cannot perform partial update: incoherent data");
    expect(oldPeriods.length).toBe(1);
    expect(oldPeriods[0].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 6 :
  //
  // old periods : p1, p2
  // new periods : No periods
  it("should keep old periods if no new Period is available", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({ __esModule: true,
                                                    default: fakeUpdatePeriodInPlace }));
    const oldPeriods = [ { id: "p1" }, { id: "p2" } ] as any;
    const newPeriods = [] as any;
    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;
    updatePeriods(oldPeriods, newPeriods);
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 7 :
  //
  // old periods : No periods
  // new periods : p1, p2
  it("should set only new Periods if none were available before", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({ __esModule: true,
                                                    default: fakeUpdatePeriodInPlace }));
    const oldPeriods = [] as any;
    const newPeriods = [ { id: "p1" }, { id: "p2" } ] as any;
    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;
    updatePeriods(oldPeriods, newPeriods);
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 8 :
  //
  // old periods : p0, p1
  // new periods : p4, p5
  it("should throw if the new periods come strictly after", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({ __esModule: true,
                                                    default: fakeUpdatePeriodInPlace }));
    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;
    const oldPeriods = [ { id: "p0", start: 50, end: 60 },
                         { id: "p1", start: 60, end: 70 } ] as any;
    const newPeriods = [ { id: "p3", start: 80 } ] as any;

    let error = null;
    try {
      updatePeriods(oldPeriods, newPeriods);
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error.type).toEqual("MEDIA_ERROR");
    expect(error.code).toEqual("MANIFEST_UPDATE_ERROR");
    expect(error.message).toEqual("MediaError (MANIFEST_UPDATE_ERROR) Cannot perform partial update: not enough data");
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p0");
    expect(oldPeriods[1].id).toBe("p1");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 9 :
  //
  // old periods: p1
  // new periods: p2
  it("should concatenate consecutive periods", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [ { id: "p1", start: 50, end: 60 } ] as any;
    const newPeriods = [ { id: "p2", start: 60, end: 80 } ] as any;
    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;

    updatePeriods(oldPeriods, newPeriods);
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 10 :
  //
  // old periods: p1
  // new periods: px
  /* tslint:disable max-line-length */
  it("should throw when encountering two completely different Periods with the same start", () => {
  /* tslint:enable max-line-length */
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [ { id: "p1", start: 50, end: 60 } ] as any;
    const newPeriods = [ { id: "px", start: 50, end: 70 } ] as any;
    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;

    let error = null;
    try {
      updatePeriods(oldPeriods, newPeriods);
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error.type).toEqual("MEDIA_ERROR");
    expect(error.code).toEqual("MANIFEST_UPDATE_ERROR");
    expect(error.message).toEqual("MediaError (MANIFEST_UPDATE_ERROR) Cannot perform partial update: incoherent data");
    expect(oldPeriods.length).toBe(1);
    expect(oldPeriods[0].id).toBe("p1");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
    /* tslint:enable no-unsafe-any */
  });

  // Case 11 :
  //
  // old periods: p0, p1, p2
  // new periods: p1, p2, p3
  it("should handle more complex period replacement", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({ __esModule: true,
                                                    default: fakeUpdatePeriodInPlace }));
    const oldPeriods = [ { id: "p0", start: 50, end: 60 },
                         { id: "p1", start: 60, end: 70 },
                         { id: "p2", start: 70 } ] as any;
    const newPeriods = [ { id: "p1", start: 60, end: 65  },
                         { id: "p2", start: 65, end: 80  },
                         { id: "p3", start: 80 } ] as any;
    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;
    updatePeriods(oldPeriods, newPeriods);
    expect(oldPeriods.length).toBe(4);

    expect(oldPeriods[0].id).toBe("p0");
    expect(oldPeriods[1].id).toBe("p1");
    expect(oldPeriods[2].id).toBe("p2");
    expect(oldPeriods[3].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace)
      .toHaveBeenNthCalledWith(1,
                               { id: "p1", start: 60, end: 70 },
                               { id: "p1", start: 60, end: 65  },
                               MANIFEST_UPDATE_TYPE.Partial);
    expect(fakeUpdatePeriodInPlace)
      .toHaveBeenNthCalledWith(2,
                               { id: "p2", start: 70 },
                               { id: "p2", start: 65, end: 80  },
                               MANIFEST_UPDATE_TYPE.Full);
    /* tslint:enable no-unsafe-any */
  });

  // Case 12 :
  //
  // old periods: p0, p1, p2, p3
  // new periods: p1, p3
  it("should handle more complex period replacement", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({ __esModule: true,
                                                    default: fakeUpdatePeriodInPlace }));
    const oldPeriods = [ { id: "p0", start: 50, end: 60 },
                         { id: "p1", start: 60, end: 70 },
                         { id: "p2", start: 70, end: 80 },
                         { id: "p3", start: 80 } ] as any;
    const newPeriods = [ { id: "p1", start: 60, end: 70  },
                         { id: "p3", start: 80 } ] as any;
    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;
    updatePeriods(oldPeriods, newPeriods);
    expect(oldPeriods.length).toBe(3);

    expect(oldPeriods[0].id).toBe("p0");
    expect(oldPeriods[1].id).toBe("p1");
    expect(oldPeriods[2].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace)
      .toHaveBeenNthCalledWith(1,
                               { id: "p1", start: 60, end: 70 },
                               { id: "p1", start: 60, end: 70  },
                               MANIFEST_UPDATE_TYPE.Partial);
    expect(fakeUpdatePeriodInPlace)
      .toHaveBeenNthCalledWith(2,
                               { id: "p3", start: 80 },
                               { id: "p3", start: 80 },
                               MANIFEST_UPDATE_TYPE.Full);
    /* tslint:enable no-unsafe-any */
  });

  // Case 13 :
  //
  // old periods: p0, p1, p2, p3, p4
  // new periods: p1, p3
  it("should remove periods not included in the new Periods", () => {
    const fakeUpdatePeriodInPlace = jest.fn(() => { return; });
    jest.mock("../update_period_in_place", () => ({ __esModule: true,
                                                    default: fakeUpdatePeriodInPlace }));
    const oldPeriods = [ { id: "p0", start: 50, end: 60 },
                         { id: "p1", start: 60, end: 70 },
                         { id: "p2", start: 70, end: 80 },
                         { id: "p3", start: 80, end: 90 },
                         { id: "p4", start: 90 } ] as any;
    const newPeriods = [ { id: "p1", start: 60, end: 70  },
                         { id: "p3", start: 80, end: 90 } ] as any;
    /* tslint:disable no-unsafe-any */
    const updatePeriods = require("../update_periods").updatePeriods;
    updatePeriods(oldPeriods, newPeriods);
    expect(oldPeriods.length).toBe(3);

    expect(oldPeriods[0].id).toBe("p0");
    expect(oldPeriods[1].id).toBe("p1");
    expect(oldPeriods[2].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace)
      .toHaveBeenNthCalledWith(1,
                               { id: "p1", start: 60, end: 70 },
                               { id: "p1", start: 60, end: 70  },
                               MANIFEST_UPDATE_TYPE.Partial);
    expect(fakeUpdatePeriodInPlace)
      .toHaveBeenNthCalledWith(2,
                               { id: "p3", start: 80, end: 90 },
                               { id: "p3", start: 80, end: 90 },
                               MANIFEST_UPDATE_TYPE.Full);
    /* tslint:enable no-unsafe-any */
  });
});
