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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

describe("Manifest - Manifest", () => {
  const fakeLogger = { warn: jest.fn(() => undefined),
                       info: jest.fn(() => undefined) };
  const fakeGenerateNewId = jest.fn(() => "fakeId");
  const fakeIdGenerator = jest.fn(() => fakeGenerateNewId);

  beforeEach(() => {
    jest.resetModules();
    fakeLogger.warn.mockClear();
    fakeLogger.info.mockClear();
    jest.mock("../../log", () =>  ({ __esModule: true as const,
                                     default: fakeLogger }));
    fakeGenerateNewId.mockClear();
    fakeIdGenerator.mockClear();
    jest.mock("../../utils/id_generator", () => ({ __esModule: true as const,
                                                   default: fakeIdGenerator }));

  });

  it("should create a normalized Manifest structure", () => {
    const simpleFakeManifest = { id: "man",
                                 isDynamic: false,
                                 isLive: false,
                                 duration: 5,
                                 timeBounds: { absoluteMinimumTime: 0,
                                               timeshiftDepth: null,
                                               maximumTimeData: { isLinear: false,
                                                                  value: 10,
                                                                  time: 10 } },
                                 periods: [] };

    const createManifestObject = require("../manifest").createManifestObject;
    const [manifest, warnings] = createManifestObject(simpleFakeManifest, {});

    expect(manifest.adaptations).toEqual({});
    expect(manifest.availabilityStartTime).toEqual(undefined);
    expect(manifest.id).toEqual("fakeId");
    expect(manifest.isDynamic).toEqual(false);
    expect(manifest.isLive).toEqual(false);
    expect(manifest.lifetime).toEqual(undefined);
    expect(manifest.getMaximumPosition()).toEqual(10);
    expect(manifest.getMinimumPosition()).toEqual(0);
    expect(warnings).toEqual([]);
    expect(manifest.periods).toEqual([]);
    expect(manifest.suggestedPresentationDelay).toEqual(undefined);
    expect(manifest.uris).toEqual([]);

    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should create a Period for each manifest.periods given", () => {
    const period1 = { id: "0", start: 4, adaptations: {} };
    const period2 = { id: "1", start: 12, adaptations: {} };
    const simpleFakeManifest = { id: "man",
                                 isDynamic: false,
                                 isLive: false,
                                 duration: 5,
                                 timeBounds: { absoluteMinimumTime: 0,
                                               timeshiftDepth: null,
                                               maximumTimeData: { isLinear: false,
                                                                  value: 10,
                                                                  time: 10 } },
                                 periods: [period1, period2] };

    const createPeriodSpy = jest.fn((period) => {
      return [{ id: `foo${period.id}`, adaptations: {} }, []];
    });
    jest.mock("../period", () =>  ({ createPeriodObject: createPeriodSpy }));

    const createManifestObject = require("../manifest").createManifestObject;
    const [manifest, warnings] = createManifestObject(simpleFakeManifest, {});
    expect(createPeriodSpy).toHaveBeenCalledTimes(2);
    expect(createPeriodSpy).toHaveBeenCalledWith(period1, undefined);
    expect(createPeriodSpy).toHaveBeenCalledWith(period2, undefined);

    expect(warnings).toEqual([]);
    expect(manifest.periods).toEqual([ { id: "foo0",
                                         adaptations: {} },
                                       { id: "foo1",
                                         adaptations: {} } ]);
    expect(manifest.adaptations).toEqual({});

    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should pass a `representationFilter` to the Period if given", () => {
    const period1 = { id: "0", start: 4, adaptations: {} };
    const period2 = { id: "1", start: 12, adaptations: {} };
    const simpleFakeManifest = { id: "man",
                                 isDynamic: false,
                                 isLive: false,
                                 duration: 5,
                                 timeBounds: { absoluteMinimumTime: 0,
                                               timeshiftDepth: null,
                                               maximumTimeData: { isLinear: false,
                                                                  value: 10,
                                                                  time: 10 } },
                                 periods: [period1, period2] };

    const representationFilter = function() { return false; };

    const createPeriodSpy = jest.fn((period) => {
      return [{ id: `foo${period.id}` }, []];
    });
    jest.mock("../period", () =>  ({ createPeriodObject: createPeriodSpy }));
    const createManifestObject = require("../manifest").createManifestObject;

    /* eslint-disable @typescript-eslint/no-unused-expressions */
    createManifestObject(simpleFakeManifest, { representationFilter });
    /* eslint-enable @typescript-eslint/no-unused-expressions */

    expect(createPeriodSpy).toHaveBeenCalledTimes(2);
    expect(createPeriodSpy).toHaveBeenCalledWith(period1, representationFilter);
    expect(createPeriodSpy).toHaveBeenCalledWith(period2, representationFilter);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should expose the adaptations of the first period if set", () => {
    const adapP1 = {};
    const adapP2 = {};
    const period1 = { id: "0", start: 4, adaptations: adapP1 };
    const period2 = { id: "1", start: 12, adaptations: adapP2 };
    const simpleFakeManifest = { id: "man",
                                 isDynamic: false,
                                 isLive: false,
                                 duration: 5,
                                 timeBounds: { absoluteMinimumTime: 0,
                                               timeshiftDepth: null,
                                               maximumTimeData: { isLinear: false,
                                                                  value: 10,
                                                                  time: 10 } },
                                 periods: [period1, period2] };

    const createPeriodSpy = jest.fn((period) => {
      return [{ ...period, id: `foo${period.id}` }, []];
    });
    jest.mock("../period", () =>  ({ createPeriodObject: createPeriodSpy }));
    const createManifestObject = require("../manifest").createManifestObject;

    const [manifest, warnings] = createManifestObject(simpleFakeManifest, {});
    expect(createPeriodSpy).toHaveBeenCalledTimes(2);
    expect(createPeriodSpy).toHaveBeenCalledWith(period1, undefined);
    expect(createPeriodSpy).toHaveBeenCalledWith(period2, undefined);
    expect(warnings).toEqual([]);

    expect(manifest.periods).toEqual([
      { id: "foo0", start: 4, adaptations: adapP1 },
      { id: "foo1", start: 12, adaptations: adapP2 },
    ]);
    expect(manifest.adaptations).toBe(adapP1);

    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should push any parsing errors from the Period parsing", () => {
    const period1 = { id: "0", start: 4, adaptations: {} };
    const period2 = { id: "1", start: 12, adaptations: {} };
    const simpleFakeManifest = { id: "man",
                                 isDynamic: false,
                                 isLive: false,
                                 duration: 5,
                                 timeBounds: { absoluteMinimumTime: 0,
                                               timeshiftDepth: null,
                                               maximumTimeData: { isLinear: false,
                                                                  value: 10,
                                                                  time: 10 } },
                                 periods: [period1, period2] };

    const createPeriodSpy = jest.fn((period) => {
      return [ { ...period, id: `foo${period.id}` },
               [ new Error(`a${period.id}`),
                 new Error(period.id) ] ];
    });
    jest.mock("../period", () =>  ({
      createPeriodObject: createPeriodSpy,
    }));
    const createManifestObject = require("../manifest").createManifestObject;

    const [_manifest, warnings] = createManifestObject(simpleFakeManifest, {});
    expect(warnings).toHaveLength(4);
    expect(warnings).toContainEqual(new Error("a0"));
    expect(warnings).toContainEqual(new Error("a1"));
    expect(warnings).toContainEqual(new Error("0"));
    expect(warnings).toContainEqual(new Error("1"));

    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should correctly parse every manifest information given", () => {
    const oldPeriod1 = { id: "0", start: 4, adaptations: {} };
    const oldPeriod2 = { id: "1", start: 12, adaptations: {} };
    const time = performance.now();
    const oldManifestArgs = { availabilityStartTime: 5,
                              duration: 12,
                              id: "man",
                              isDynamic: false,
                              isLive: false,
                              lifetime: 13,
                              periods: [oldPeriod1, oldPeriod2],
                              timeBounds: { absoluteMinimumTime: 5,
                                            timeshiftDepth: null,
                                            maximumTimeData: { isLinear: false,
                                                               value: 10,
                                                               time } },
                              suggestedPresentationDelay: 99,
                              uris: ["url1", "url2"] };

    const createPeriodSpy = jest.fn((period) => {
      return [ { ...period,
                 id: `foo${period.id}` },
               [new Error(period.id)] ];
    });
    jest.mock("../period", () =>  ({ createPeriodObject: createPeriodSpy }));
    const createManifestObject = require("../manifest").createManifestObject;
    const [manifest, warnings] = createManifestObject(oldManifestArgs, {});

    expect(manifest.adaptations).toEqual({});
    expect(manifest.availabilityStartTime).toEqual(5);
    expect(manifest.id).toEqual("fakeId");
    expect(manifest.isDynamic).toEqual(false);
    expect(manifest.isLive).toEqual(false);
    expect(manifest.lifetime).toEqual(13);
    expect(warnings).toEqual([new Error("0"), new Error("1")]);
    expect(manifest.getMaximumPosition()).toEqual(10);
    expect(manifest.getMinimumPosition()).toEqual(5);
    expect(manifest.periods).toEqual([
      { id: "foo0", adaptations: {}, start: 4 },
      { id: "foo1", adaptations: {}, start: 12 },
    ]);
    expect(manifest.suggestedPresentationDelay).toEqual(99);
    expect(manifest.uris).toEqual(["url1", "url2"]);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should return the first URL given with `getUrl`", () => {
    const createPeriodSpy = jest.fn((period) => {
      return [{ id: `foo${period.id}`, adaptations: {} },
              [new Error(period.id)]];
    });
    jest.mock("../period", () =>  ({
      createPeriodObject: createPeriodSpy,
    }));
    const createManifestObject = require("../manifest").createManifestObject;

    const oldManifestArgs1 = { availabilityStartTime: 5,
                               duration: 12,
                               id: "man",
                               isDynamic: false,
                               isLive: false,
                               lifetime: 13,
                               timeBounds: { absoluteMinimumTime: 0,
                                             timeshiftDepth: null,
                                             maximumTimeData: { isLinear: false,
                                                                value: 10,
                                                                time: 10 } },
                               periods: [ { id: "0", start: 4, adaptations: {} },
                                          { id: "1", start: 12, adaptations: {} } ],
                               suggestedPresentationDelay: 99,
                               uris: ["url1", "url2"] };

    const [manifest1, warnings1] = createManifestObject(oldManifestArgs1, {});
    expect(manifest1.getUrl()).toEqual("url1");
    expect(warnings1).toEqual([new Error("0"), new Error("1")]);

    const oldManifestArgs2 = { availabilityStartTime: 5,
                               duration: 12,
                               id: "man",
                               isDynamic: false,
                               isLive: false,
                               lifetime: 13,
                               periods: [ { id: "0", start: 4, adaptations: {} },
                                          { id: "1", start: 12, adaptations: {} } ],
                               suggestedPresentationDelay: 99,
                               timeBounds: { absoluteMinimumTime: 0,
                                             timeshiftDepth: null,
                                             maximumTimeData: { isLinear: false,
                                                                value: 10,
                                                                time: 10 } },
                               uris: [] };
    const [manifest2, warnings2] = createManifestObject(oldManifestArgs2, {});
    expect(manifest2.getUrl()).toEqual(undefined);
    expect(warnings2).toEqual([new Error("0"), new Error("1")]);
  });

  it("should replace with a new Manifest when calling `replace`", () => {
    const createPeriodSpy = jest.fn((period) => {
      return [{ id: `foo${period.id}`, adaptations: {} },
              [new Error(period.id)]];
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).forEach(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
      oldPeriod.start = newPeriod.start;
      oldPeriod.adaptations = newPeriod.adaptations;
    });
    jest.mock("../period", () => ({ createPeriodObject: createPeriodSpy }));
    jest.mock("../update_period_in_place", () => ({ __esModule: true as const,
                                                    default: fakeUpdatePeriodInPlace }));

    const oldManifestArgs = { availabilityStartTime: 5,
                              duration: 12,
                              id: "man",
                              isDynamic: false,
                              isLive: false,
                              lifetime: 13,
                              periods: [ { id: "0", start: 4, adaptations: {} },
                                         { id: "1", start: 12, adaptations: {} } ],
                              timeBounds: { absoluteMinimumTime: 7,
                                            timeshiftDepth: 10,
                                            maximumTimeData: { isLinear: true,
                                                               value: 30,
                                                               time: 30000 } },
                              suggestedPresentationDelay: 99,
                              uris: ["url1", "url2"] };

    const createManifestObject = require("../manifest").createManifestObject;
    const [manifest, warnings] = createManifestObject(oldManifestArgs, {});
    let nbOfManifestUpdates = 0;
    function onManifestUpdate() {
      nbOfManifestUpdates++;
    }
    manifest.addEventListener("manifestUpdate", onManifestUpdate);

    const [oldPeriod1, oldPeriod2] = manifest.periods;

    const newAdaptations = {};
    const newPeriod1 = { id: "foo0", start: 12, adaptations: {} };
    const newPeriod2 = { id: "foo1", start: 40, adaptations: {} };
    const newManifest = { adaptations: newAdaptations,
                          availabilityStartTime: 6,
                          id: "man2",
                          isDynamic: true,
                          isLive: true,
                          lifetime: 14,
                          suggestedPresentationDelay: 100,
                          timeShiftBufferDepth: 3,
                          timeBounds: { absoluteMinimumTime: 30,
                                        timeshiftDepth: 5,
                                        maximumTimeData: { isLinear: false,
                                                           value: 40,
                                                           time: 30000 } },
                          periods: [newPeriod1, newPeriod2],
                          uris: ["url3", "url4"] };

    manifest.replace(newManifest);
    manifest.removeEventListener("manifestUpdate", onManifestUpdate);
    expect(nbOfManifestUpdates).toEqual(1);
    expect(manifest.adaptations).toEqual(newAdaptations);
    expect(manifest.availabilityStartTime).toEqual(6);
    expect(manifest.id).toEqual("fakeId");
    expect(manifest.isDynamic).toEqual(true);
    expect(manifest.isLive).toEqual(true);
    expect(manifest.lifetime).toEqual(14);
    expect(warnings).toEqual([new Error("0"), new Error("1")]);
    expect(manifest.getMinimumPosition()).toEqual(40 - 5);
    expect(manifest.getMaximumPosition()).toEqual(40);
    expect(manifest.suggestedPresentationDelay).toEqual(100);
    expect(manifest.uris).toEqual(["url3", "url4"]);

    expect(manifest.periods).toEqual([newPeriod1, newPeriod2]);

    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod1, newPeriod1, 0);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod2, newPeriod2, 0);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should prepend older Periods when calling `replace`", () => {
    const oldManifestArgs = { availabilityStartTime: 5,
                              duration: 12,
                              id: "man",
                              isDynamic: false,
                              isLive: false,
                              lifetime: 13,
                              timeBounds: { absoluteMinimumTime: 0,
                                            timeshiftDepth: null,
                                            maximumTimeData: { isLinear: false,
                                                               value: 10,
                                                               time: 10 } },
                              periods: [{ id: "1", start: 4, adaptations: {} }],
                              suggestedPresentationDelay: 99,
                              uris: ["url1", "url2"] };

    const createPeriodSpy = jest.fn((period) => {
      return [ { ...period,
                 id: `foo${period.id}` },
               [new Error(period.id)] ];
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).forEach(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
      oldPeriod.start = newPeriod.start;
      oldPeriod.adaptations = newPeriod.adaptations;
    });
    jest.mock("../period", () =>  ({ createPeriodObject: createPeriodSpy }));
    jest.mock("../update_period_in_place", () =>  ({
      __esModule: true as const,
      default: fakeUpdatePeriodInPlace,
    }));
    const createManifestObject = require("../manifest").createManifestObject;
    const [manifest, warnings] = createManifestObject(oldManifestArgs, {});
    expect(warnings).toEqual([new Error("1")]);
    let nbOfManifestUpdates = 0;
    function onManifestUpdate() {
      nbOfManifestUpdates++;
    }
    manifest.addEventListener("manifestUpdate", onManifestUpdate);

    const [oldPeriod1] = manifest.periods;

    const newPeriod1 = { id: "pre0",
                         start: 0,
                         adaptations: {} };
    const newPeriod2 = { id: "pre1",
                         start: 2,
                         adaptations: {} };
    const newPeriod3 = { id: "foo1",
                         start: 4,
                         adaptations: {} };
    const newManifest = { adaptations: {},
                          availabilityStartTime: 6,
                          id: "man2",
                          isDynamic: false,
                          isLive: true,
                          lifetime: 14,
                          suggestedPresentationDelay: 100,
                          periods: [ newPeriod1,
                                     newPeriod2,
                                     newPeriod3 ],
                          timeBounds: { absoluteMinimumTime: 0,
                                        timeshiftDepth: null,
                                        maximumTimeData: { isLinear: false,
                                                           value: 10,
                                                           time: 10 } },
                          uris: ["url3", "url4"] };

    manifest.replace(newManifest);
    manifest.removeEventListener("manifestUpdate", onManifestUpdate);
    expect(nbOfManifestUpdates).toEqual(1);

    expect(manifest.periods).toEqual([newPeriod1, newPeriod2, newPeriod3]);

    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod1, newPeriod3, 0);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    // expect(fakeLogger.info).toHaveBeenCalledTimes(2);
    // expect(fakeLogger.info).toHaveBeenCalledWith(
    //   "Manifest: Adding new Period pre0 after update.");
    // expect(fakeLogger.info).toHaveBeenCalledWith(
    //   "Manifest: Adding new Period pre1 after update.");
  });

  it("should append newer Periods when calling `replace`", () => {
    const oldManifestArgs = { availabilityStartTime: 5,
                              duration: 12,
                              id: "man",
                              isDynamic: false,
                              isLive: false,
                              lifetime: 13,
                              periods: [{ id: "1" }],
                              suggestedPresentationDelay: 99,
                              timeBounds: { absoluteMinimumTime: 0,
                                            timeshiftDepth: null,
                                            maximumTimeData: { isLinear: false,
                                                               value: 10,
                                                               time: 10 } },
                              uris: ["url1", "url2"] };

    const createPeriodSpy = jest.fn((period) => {
      return [ { ...period,
                 id: `foo${period.id}` },
               [new Error(period.id)] ];
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).forEach(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
    });
    jest.mock("../period", () =>  ({ createPeriodObject: createPeriodSpy }));
    jest.mock("../update_period_in_place", () =>  ({
      __esModule: true as const,
      default: fakeUpdatePeriodInPlace,
    }));
    const createManifestObject = require("../manifest").createManifestObject;
    const [manifest, warnings] = createManifestObject(oldManifestArgs, {});
    expect(warnings).toEqual([new Error("1")]);
    const [oldPeriod1] = manifest.periods;

    let nbOfManifestUpdates = 0;
    function onManifestUpdate() {
      nbOfManifestUpdates++;
    }
    manifest.addEventListener("manifestUpdate", onManifestUpdate);

    const newPeriod1 = { id: "foo1" };
    const newPeriod2 = { id: "post0" };
    const newPeriod3 = { id: "post1" };
    const newManifest = { adaptations: {},
                          availabilityStartTime: 6,
                          id: "man2",
                          isDynamic: false,
                          isLive: true,
                          lifetime: 14,
                          suggestedPresentationDelay: 100,
                          periods: [newPeriod1, newPeriod2, newPeriod3],
                          timeBounds: { absoluteMinimumTime: 0,
                                        timeshiftDepth: null,
                                        maximumTimeData: { isLinear: false,
                                                           value: 10,
                                                           time: 10 } },
                          uris: ["url3", "url4"] };

    manifest.replace(newManifest);
    manifest.removeEventListener("manifestUpdate", onManifestUpdate);
    expect(nbOfManifestUpdates).toEqual(1);

    expect(manifest.periods).toEqual([newPeriod1, newPeriod2, newPeriod3]);

    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod1, newPeriod1, 0);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    // expect(fakeLogger.warn).toHaveBeenCalledTimes(1);
    // expect(fakeLogger.warn)
    // .toHaveBeenCalledWith("Manifest: Adding new Periods after update.");
  });

  it("should replace different Periods when calling `replace`", () => {
    const oldManifestArgs = { availabilityStartTime: 5,
                              duration: 12,
                              id: "man",
                              isDynamic: false,
                              isLive: false,
                              lifetime: 13,
                              periods: [{ id: "1" }],
                              suggestedPresentationDelay: 99,
                              timeBounds: { absoluteMinimumTime: 0,
                                            timeshiftDepth: null,
                                            maximumTimeData: { isLinear: false,
                                                               value: 10,
                                                               time: 10 } },
                              uris: ["url1", "url2"] };

    const createPeriodSpy = jest.fn((period) => {
      return [{ id: `foo${period.id}`, adaptations: {} },
              [new Error(period.id)]];
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).forEach(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
    });
    jest.mock("../period", () =>  ({ createPeriodObject: createPeriodSpy }));
    jest.mock("../update_period_in_place", () =>  ({
      __esModule: true as const,
      default: fakeUpdatePeriodInPlace,
    }));
    const createManifestObject = require("../manifest").createManifestObject;
    const [manifest, warnings] = createManifestObject(oldManifestArgs, {});

    let nbOfManifestUpdates = 0;
    function onManifestUpdate() {
      nbOfManifestUpdates++;
    }
    manifest.addEventListener("manifestUpdate", onManifestUpdate);

    const newPeriod1 = { id: "diff0" };
    const newPeriod2 = { id: "diff1" };
    const newPeriod3 = { id: "diff2" };
    const newManifest = { adaptations: {},
                          availabilityStartTime: 6,
                          id: "man2",
                          isDynamic: false,
                          isLive: true,
                          lifetime: 14,
                          suggestedPresentationDelay: 100,
                          periods: [newPeriod1, newPeriod2, newPeriod3],
                          timeBounds: { absoluteMinimumTime: 0,
                                        timeshiftDepth: null,
                                        maximumTimeData: { isLinear: false,
                                                           value: 10,
                                                           time: 10 } },
                          uris: ["url3", "url4"] };

    manifest.replace(newManifest);

    expect(warnings).toEqual([new Error("1")]);
    expect(manifest.periods).toEqual([newPeriod1, newPeriod2, newPeriod3]);

    expect(fakeUpdatePeriodInPlace).not.toHaveBeenCalled();
    manifest.removeEventListener("manifestUpdate", onManifestUpdate);
    expect(nbOfManifestUpdates).toEqual(1);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    // expect(fakeLogger.info).toHaveBeenCalledTimes(4);
  });

  it("should merge overlapping Periods when calling `replace`", () => {
    const oldManifestArgs = { availabilityStartTime: 5,
                              duration: 12,
                              id: "man",
                              isDynamic: false,
                              isLive: false,
                              lifetime: 13,
                              periods: [{ id: "1", start: 2 },
                                        { id: "2", start: 4 },
                                        { id: "3", start: 6 }],
                              timeBounds: { absoluteMinimumTime: 0,
                                            timeshiftDepth: null,
                                            maximumTimeData: { isLinear: false,
                                                               value: 10,
                                                               time: 10 } },
                              suggestedPresentationDelay: 99,
                              uris: ["url1", "url2"] };

    const createPeriodSpy = jest.fn((period) => {
      return [{ id: `foo${period.id}`, adaptations: {} },
              [new Error(period.id)]];
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).forEach(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
      oldPeriod.start = newPeriod.start;
    });
    jest.mock("../period", () =>  ({ createPeriodObject: createPeriodSpy }));
    jest.mock("../update_period_in_place", () =>  ({
      __esModule: true as const,
      default: fakeUpdatePeriodInPlace,
    }));
    const createManifestObject = require("../manifest").createManifestObject;
    const [manifest, warnings] = createManifestObject(oldManifestArgs, {});
    expect(warnings).toEqual([new Error("1"), new Error("2"), new Error("3")]);
    const [oldPeriod1, oldPeriod2] = manifest.periods;

    let nbOfManifestUpdates = 0;
    function onManifestUpdate() {
      nbOfManifestUpdates++;
    }
    manifest.addEventListener("manifestUpdate", onManifestUpdate);

    const newPeriod1 = { id: "pre0", start: 0 };
    const newPeriod2 = { id: "foo1", start: 2 };
    const newPeriod3 = { id: "diff0", start: 3 };
    const newPeriod4 = { id: "foo2", start: 4 };
    const newPeriod5 = { id: "post0", start: 5 };
    const newManifest = { adaptations: {},
                          availabilityStartTime: 6,
                          id: "man2",
                          isDynamic: false,
                          isLive: true,
                          lifetime: 14,
                          suggestedPresentationDelay: 100,
                          periods: [ newPeriod1,
                                     newPeriod2,
                                     newPeriod3,
                                     newPeriod4,
                                     newPeriod5 ],
                          timeBounds: { absoluteMinimumTime: 0,
                                        timeshiftDepth: null,
                                        maximumTimeData: { isLinear: false,
                                                           value: 10,
                                                           time: 10 } },
                          uris: ["url3", "url4"] };

    manifest.replace(newManifest);

    expect(manifest.periods).toEqual([ newPeriod1,
                                       newPeriod2,
                                       newPeriod3,
                                       newPeriod4,
                                       newPeriod5 ]);

    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod1, newPeriod2, 0);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod2, newPeriod4, 0);
    manifest.removeEventListener("manifestUpdate", onManifestUpdate);
    expect(nbOfManifestUpdates).toEqual(1);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    // expect(fakeLogger.info).toHaveBeenCalledTimes(5);
  });
});
