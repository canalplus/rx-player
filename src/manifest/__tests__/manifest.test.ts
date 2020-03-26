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

/* tslint:disable no-unsafe-any */
describe("Manifest - Manifest", () => {
  const fakeLogger = { warn: jest.fn(() => undefined),
                       info: jest.fn(() => undefined) };
  const fakeGenerateNewId = jest.fn(() => "fakeId");
  const fakeIdGenerator = jest.fn(() => fakeGenerateNewId);

  beforeEach(() => {
    jest.resetModules();
    fakeLogger.warn.mockClear();
    fakeLogger.info.mockClear();
    jest.mock("../../log", () =>  ({ __esModule: true,
                                     default: fakeLogger }));
    fakeGenerateNewId.mockClear();
    fakeIdGenerator.mockClear();
    jest.mock("../../utils/id_generator", () => ({ __esModule: true,
                                                   default: fakeIdGenerator }));

  });

  it("should create a normalized Manifest structure", () => {
    const simpleFakeManifest = { id: "man",
                                 isDynamic: false,
                                 isLive: false,
                                 duration: 5,
                                 periods: [],
                                 transportType: "foobar" };

    const Manifest = require("../manifest").default;
    const manifest = new Manifest(simpleFakeManifest, {});

    expect(manifest.adaptations).toEqual({});
    expect(manifest.availabilityStartTime).toEqual(undefined);
    expect(manifest.id).toEqual("fakeId");
    expect(manifest.isDynamic).toEqual(false);
    expect(manifest.isLive).toEqual(false);
    expect(manifest.lifetime).toEqual(undefined);
    expect(manifest.maximumTime).toEqual(undefined);
    expect(manifest.minimumTime).toEqual(undefined);
    expect(manifest.parsingErrors).toEqual([]);
    expect(manifest.periods).toEqual([]);
    expect(manifest.suggestedPresentationDelay).toEqual(undefined);
    expect(manifest.transport).toEqual("foobar");
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
                                 periods: [period1, period2],
                                 transportType: "foobar" };

    const fakePeriod = jest.fn((period) => {
      return { id: `foo${period.id}`, adaptations: {}, parsingErrors: [] };
    });
    jest.mock("../period", () =>  ({ __esModule: true,
                                     default: fakePeriod }));

    const Manifest = require("../manifest").default;
    const manifest = new Manifest(simpleFakeManifest, {});
    expect(fakePeriod).toHaveBeenCalledTimes(2);
    expect(fakePeriod).toHaveBeenCalledWith(period1, undefined);
    expect(fakePeriod).toHaveBeenCalledWith(period2, undefined);

    expect(manifest.periods).toEqual([ { id: "foo0",
                                         adaptations: {},
                                         parsingErrors: [] },
                                       { id: "foo1",
                                         adaptations: {},
                                         parsingErrors: [] } ]);
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
                                 periods: [period1, period2],
                                 transportType: "foobar" };

    const representationFilter = function() { return false; };

    const fakePeriod = jest.fn((period) => {
      return { id: `foo${period.id}`, parsingErrors: [] };
    });
    jest.mock("../period", () =>  ({ __esModule: true,
                                     default: fakePeriod }));
    const Manifest = require("../manifest").default;

    /* tslint:disable no-unused-expression */
    new Manifest(simpleFakeManifest, { representationFilter });
    /* tslint:enable no-unused-expression */

    expect(fakePeriod).toHaveBeenCalledTimes(2);
    expect(fakePeriod).toHaveBeenCalledWith(period1, representationFilter);
    expect(fakePeriod).toHaveBeenCalledWith(period2, representationFilter);
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
                                 periods: [period1, period2],
                                 transportType: "foobar" };

    const fakePeriod = jest.fn((period) => {
      return { ...period, id: `foo${period.id}`, parsingErrors: [] };
    });
    jest.mock("../period", () =>  ({ __esModule: true,
                                     default: fakePeriod }));
    const Manifest = require("../manifest").default;

    const manifest = new Manifest(simpleFakeManifest, {});
    expect(fakePeriod).toHaveBeenCalledTimes(2);
    expect(fakePeriod).toHaveBeenCalledWith(period1, undefined);
    expect(fakePeriod).toHaveBeenCalledWith(period2, undefined);

    expect(manifest.periods).toEqual([
      { id: "foo0", parsingErrors: [], start: 4, adaptations: adapP1 },
      { id: "foo1", parsingErrors: [], start: 12, adaptations: adapP2 },
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
                                 periods: [period1, period2],
                                 transportType: "foobar" };

    const fakePeriod = jest.fn((period) => {
      return { id: `foo${period.id}`,
               parsingErrors: [ new Error(`a${period.id}`),
                                new Error(period.id) ] };
    });
    jest.mock("../period", () =>  ({
      __esModule: true,
      default: fakePeriod,
    }));
    const Manifest = require("../manifest").default;

    const manifest = new Manifest(simpleFakeManifest, {});
    expect(manifest.parsingErrors).toHaveLength(4);
    expect(manifest.parsingErrors).toContainEqual(new Error("a0"));
    expect(manifest.parsingErrors).toContainEqual(new Error("a1"));
    expect(manifest.parsingErrors).toContainEqual(new Error("0"));
    expect(manifest.parsingErrors).toContainEqual(new Error("1"));

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
                              parsingErrors: [new Error("a"), new Error("b")],
                              periods: [oldPeriod1, oldPeriod2],
                              maximumTime: { isContinuous: false, value: 10, time },
                              minimumTime: { isContinuous: true, value: 5, time },
                              suggestedPresentationDelay: 99,
                              transportType: "foobar",
                              uris: ["url1", "url2"] };

    const fakePeriod = jest.fn((period) => {
      return { ...period,
               id: `foo${period.id}`,
               parsingErrors: [new Error(period.id)] };
    });
    jest.mock("../period", () =>  ({ __esModule: true,
                                     default: fakePeriod }));
    const Manifest = require("../manifest").default;
    const manifest = new Manifest(oldManifestArgs, {});

    expect(manifest.adaptations).toEqual({});
    expect(manifest.availabilityStartTime).toEqual(5);
    expect(manifest.id).toEqual("fakeId");
    expect(manifest.isDynamic).toEqual(false);
    expect(manifest.isLive).toEqual(false);
    expect(manifest.lifetime).toEqual(13);
    expect(manifest.parsingErrors).toEqual([new Error("0"), new Error("1")]);
    expect(manifest.maximumTime).toEqual({ isContinuous: false, value: 10, time });
    expect(manifest.minimumTime).toEqual({ isContinuous: true, value: 5, time });
    expect(manifest.periods).toEqual([
      { id: "foo0", parsingErrors: [new Error("0")], adaptations: {}, start: 4 },
      { id: "foo1", parsingErrors: [new Error("1")], adaptations: {}, start: 12 },
    ]);
    expect(manifest.suggestedPresentationDelay).toEqual(99);
    expect(manifest.transport).toEqual("foobar");
    expect(manifest.uris).toEqual(["url1", "url2"]);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should return the first URL given with `getUrl`", () => {
    const fakePeriod = jest.fn((period) => {
      return {
        ...period,
        id: `foo${period.id}`,
        parsingErrors: [new Error(period.id)],
      };
    });
    jest.mock("../period", () =>  ({
      __esModule: true,
      default: fakePeriod,
    }));
    const Manifest = require("../manifest").default;

    const oldManifestArgs1 = { availabilityStartTime: 5,
                               duration: 12,
                               id: "man",
                               isDynamic: false,
                               isLive: false,
                               lifetime: 13,
      parsingErrors: [new Error("a"), new Error("b")],
      periods: [
        { id: "0", start: 4, adaptations: {} },
        { id: "1", start: 12, adaptations: {} },
      ],
      suggestedPresentationDelay: 99,
      transportType: "foobar",
      uris: ["url1", "url2"],
    };

    const manifest1 = new Manifest(oldManifestArgs1, {});
    expect(manifest1.getUrl()).toEqual("url1");

    const oldManifestArgs2 = { availabilityStartTime: 5,
                               duration: 12,
                               id: "man",
                               isDynamic: false,
                               isLive: false,
                               lifetime: 13,
                               minimumTime: 4,
                               parsingErrors: [new Error("a"), new Error("b")],
                               periods: [
                                 { id: "0", start: 4, adaptations: {} },
                                 { id: "1", start: 12, adaptations: {} },
                               ],
                               suggestedPresentationDelay: 99,
                               transportType: "foobar",
                               uris: [] };
    const manifest2 = new Manifest(oldManifestArgs2, {});
    expect(manifest2.getUrl()).toEqual(undefined);
  });

  it("should update with a new Manifest when calling `update`", () => {
    const fakePeriod = jest.fn((period) => {
      return {
        ...period,
        id: `foo${period.id}`,
        parsingErrors: [new Error(period.id)],
      };
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).forEach(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
      oldPeriod.start = newPeriod.start;
      oldPeriod.adaptations = newPeriod.adaptations;
    });
    jest.mock("../period", () =>  ({
      __esModule: true,
      default: fakePeriod,
    }));
    jest.mock("../update_period_in_place", () =>  ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));

    const oldManifestArgs = { availabilityStartTime: 5,
                              duration: 12,
                              id: "man",
                              isDynamic: false,
                              isLive: false,
                              lifetime: 13,
                              parsingErrors: [ new Error("a"),
                                               new Error("b") ],
                              periods: [ { id: "0", start: 4, adaptations: {} },
                                         { id: "1", start: 12, adaptations: {} } ],
                              maximumTime: { isContinuous: false,
                                             value: 10,
                                             time: 30000 },
                              minimumTime: { isContinuous: true,
                                             value: 7,
                                             time: 10000 },
                              suggestedPresentationDelay: 99,
                              transportType: "foobar",
                              uris: ["url1", "url2"] };

    const Manifest = require("../manifest").default;
    const manifest = new Manifest(oldManifestArgs, {});

    const eeSpy = jest.spyOn(manifest, "trigger").mockImplementation(jest.fn());

    const [oldPeriod1, oldPeriod2] = manifest.periods;

    const newMinimumTime = { isContinuous: false, value: 1, time: 5000000 };
    const newMaximumTime = { isContinuous: true, value: 3, time: 4000000 };
    const newAdaptations = {};
    const newPeriod1 = { id: "foo0", start: 4, adaptations: {} };
    const newPeriod2 = { id: "foo1", start: 12, adaptations: {} };
    const newManifest : any = { adaptations: newAdaptations,
                                availabilityStartTime: 6,
                                id: "man2",
                                isDynamic: true,
                                isLive: true,
                                lifetime: 14,
                                parsingErrors: [new Error("c"), new Error("d")],
                                suggestedPresentationDelay: 100,
                                timeShiftBufferDepth: 3,
                                maximumTime: newMaximumTime,
                                minimumTime: newMinimumTime,
                                periods: [newPeriod1, newPeriod2],
                                transport: "foob",
                                uris: ["url3", "url4"] };

    manifest.replace(newManifest);
    expect(manifest.adaptations).toEqual(newAdaptations);
    expect(manifest.availabilityStartTime).toEqual(6);
    expect(manifest.id).toEqual("fakeId");
    expect(manifest.isDynamic).toEqual(true);
    expect(manifest.isLive).toEqual(true);
    expect(manifest.lifetime).toEqual(14);
    expect(manifest.parsingErrors).toEqual([new Error("c"), new Error("d")]);
    expect(manifest.maximumTime).toEqual(newMaximumTime);
    expect(manifest.minimumTime).toEqual(newMinimumTime);
    expect(manifest.suggestedPresentationDelay).toEqual(100);
    expect(manifest.transport).toEqual("foob");
    expect(manifest.uris).toEqual(["url3", "url4"]);

    expect(manifest.periods).toEqual([newPeriod1, newPeriod2]);

    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod1, newPeriod1, 0);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod2, newPeriod2, 0);
    expect(eeSpy).toHaveBeenCalledTimes(1);
    expect(eeSpy).toHaveBeenCalledWith("manifestUpdate", null);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
    eeSpy.mockRestore();
  });

  it("should prepend older Periods when calling `update`", () => {
    const oldManifestArgs = { availabilityStartTime: 5,
                              duration: 12,
                              id: "man",
                              isDynamic: false,
                              isLive: false,
                              lifetime: 13,
                              minimumTime: 4,
                              parsingErrors: [new Error("a"), new Error("b")],
                              periods: [{ id: "1", start: 4, adaptations: {} }],
                              suggestedPresentationDelay: 99,
                              transportType: "foobar",
                              uris: ["url1", "url2"] };

    const fakePeriod = jest.fn((period) => {
      return {
        ...period,
        id: `foo${period.id}`,
        parsingErrors: [new Error(period.id)],
      };
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).forEach(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
      oldPeriod.start = newPeriod.start;
      oldPeriod.adaptations = newPeriod.adaptations;
      oldPeriod.parsingErrors = newPeriod.parsingErrors;
    });
    jest.mock("../period", () =>  ({ __esModule: true,
                                     default: fakePeriod }));
    jest.mock("../update_period_in_place", () =>  ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const Manifest = require("../manifest").default;
    const manifest = new Manifest(oldManifestArgs, {});
    const [oldPeriod1] = manifest.periods;

    const eeSpy = jest.spyOn(manifest, "trigger").mockImplementation(jest.fn());

    const newPeriod1 = { id: "pre0",
                         start: 0,
                         adaptations: {},
                         parsingErrors: [] };
    const newPeriod2 = { id: "pre1",
                         start: 2,
                         adaptations: {},
                         parsingErrors: [] };
    const newPeriod3 = { id: "foo1",
                         start: 4,
                         adaptations: {},
                         parsingErrors: [] };
    const newManifest = { adaptations: {},
                          availabilityStartTime: 6,
                          id: "man2",
                          isDynamic: false,
                          isLive: true,
                          lifetime: 14,
                          minimumTime: 5,
                          parsingErrors: [ new Error("c"),
                                           new Error("d") ],
                          suggestedPresentationDelay: 100,
                          periods: [ newPeriod1,
                                     newPeriod2,
                                     newPeriod3 ],
                          transport: "foob",
                          uris: ["url3", "url4"] };

    manifest.replace(newManifest as any);

    expect(manifest.periods).toEqual([newPeriod1, newPeriod2, newPeriod3]);

    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod1, newPeriod3, 0);
    expect(eeSpy).toHaveBeenCalledTimes(1);
    expect(eeSpy).toHaveBeenCalledWith("manifestUpdate", null);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    // expect(fakeLogger.info).toHaveBeenCalledTimes(2);
    // expect(fakeLogger.info).toHaveBeenCalledWith(
    //   "Manifest: Adding new Period pre0 after update.");
    // expect(fakeLogger.info).toHaveBeenCalledWith(
    //   "Manifest: Adding new Period pre1 after update.");
    eeSpy.mockRestore();
  });

  it("should append newer Periods when calling `update`", () => {
    const oldManifestArgs = { availabilityStartTime: 5,
                              duration: 12,
                              id: "man",
                              isDynamic: false,
                              isLive: false,
                              lifetime: 13,
                              minimumTime: 4,
                              parsingErrors: [new Error("a"), new Error("b")],
                              periods: [{ id: "1" }],
                              suggestedPresentationDelay: 99,
                              transportType: "foobar",
                              uris: ["url1", "url2"] };

    const fakePeriod = jest.fn((period) => {
      return { ...period,
               id: `foo${period.id}`,
               parsingErrors: [new Error(period.id)] };
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).forEach(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
    });
    jest.mock("../period", () =>  ({ __esModule: true,
                                     default: fakePeriod }));
    jest.mock("../update_period_in_place", () =>  ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const Manifest = require("../manifest").default;
    const manifest = new Manifest(oldManifestArgs as any, {});
    const [oldPeriod1] = manifest.periods;

    const eeSpy = jest.spyOn(manifest, "trigger").mockImplementation(jest.fn());

    const newPeriod1 = { id: "foo1" };
    const newPeriod2 = { id: "post0" };
    const newPeriod3 = { id: "post1" };
    const newManifest = { adaptations: {},
                          availabilityStartTime: 6,
                          id: "man2",
                          isDynamic: false,
                          isLive: true,
                          lifetime: 14,
                          minimumTime: 5,
                          parsingErrors: [new Error("c"), new Error("d")],
                          suggestedPresentationDelay: 100,
                          periods: [newPeriod1, newPeriod2, newPeriod3],
                          transport: "foob",
                          uris: ["url3", "url4"] };

    manifest.replace(newManifest as any);

    expect(manifest.periods).toEqual([newPeriod1, newPeriod2, newPeriod3]);

    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod1, newPeriod1, 0);
    expect(eeSpy).toHaveBeenCalledTimes(1);
    expect(eeSpy).toHaveBeenCalledWith("manifestUpdate", null);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    // expect(fakeLogger.warn).toHaveBeenCalledTimes(1);
    // expect(fakeLogger.warn)
    // .toHaveBeenCalledWith("Manifest: Adding new Periods after update.");
    eeSpy.mockRestore();
  });

  it("should replace different Periods when calling `update`", () => {
    const oldManifestArgs = { availabilityStartTime: 5,
                              duration: 12,
                              id: "man",
                              isDynamic: false,
                              isLive: false,
                              lifetime: 13,
                              minimumTime: 4,
                              parsingErrors: [new Error("a"), new Error("b")],
                              periods: [{ id: "1" }],
                              suggestedPresentationDelay: 99,
                              transportType: "foobar",
                              uris: ["url1", "url2"] };

    const fakePeriod = jest.fn((period) => {
      return { ...period,
               id: `foo${period.id}`,
               parsingErrors: [new Error(period.id)] };
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).forEach(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
    });
    jest.mock("../period", () =>  ({ __esModule: true,
                                     default: fakePeriod }));
    jest.mock("../update_period_in_place", () =>  ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const Manifest = require("../manifest").default;
    const manifest = new Manifest(oldManifestArgs as any, {});

    const eeSpy = jest.spyOn(manifest, "trigger").mockImplementation(jest.fn());

    const newPeriod1 = { id: "diff0" };
    const newPeriod2 = { id: "diff1" };
    const newPeriod3 = { id: "diff2" };
    const newManifest = { adaptations: {},
                          availabilityStartTime: 6,
                          id: "man2",
                          isDynamic: false,
                          isLive: true,
                          lifetime: 14,
                          minimumTime: 5,
                          parsingErrors: [new Error("c"), new Error("d")],
                          suggestedPresentationDelay: 100,
                          periods: [newPeriod1, newPeriod2, newPeriod3],
                          transport: "foob",
                          uris: ["url3", "url4"] };

    manifest.replace(newManifest as any);

    expect(manifest.periods).toEqual([newPeriod1, newPeriod2, newPeriod3]);

    expect(fakeUpdatePeriodInPlace).not.toHaveBeenCalled();
    expect(eeSpy).toHaveBeenCalledTimes(1);
    expect(eeSpy).toHaveBeenCalledWith("manifestUpdate", null);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    // expect(fakeLogger.info).toHaveBeenCalledTimes(4);
    eeSpy.mockRestore();
  });

  it("should merge overlapping Periods when calling `update`", () => {
    const oldManifestArgs = { availabilityStartTime: 5,
                              duration: 12,
                              id: "man",
                              isDynamic: false,
                              isLive: false,
                              lifetime: 13,
                              minimumTime: 4,
                              parsingErrors: [new Error("a"), new Error("b")],
                              periods: [{ id: "1", start: 2 },
                                        { id: "2", start: 4 },
                                        { id: "3", start: 6 }],
                              suggestedPresentationDelay: 99,
                              transportType: "foobar",
                              uris: ["url1", "url2"] };

    const fakePeriod = jest.fn((period) => {
      return { ...period,
               id: `foo${period.id}`,
               parsingErrors: [new Error(period.id)] };
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).forEach(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
      oldPeriod.start = newPeriod.start;
    });
    jest.mock("../period", () =>  ({ __esModule: true,
                                     default: fakePeriod }));
    jest.mock("../update_period_in_place", () =>  ({
      __esModule: true,
      default: fakeUpdatePeriodInPlace,
    }));
    const Manifest = require("../manifest").default;
    const manifest = new Manifest(oldManifestArgs as any, {});
    const [oldPeriod1, oldPeriod2] = manifest.periods;

    const eeSpy = jest.spyOn(manifest, "trigger").mockImplementation(jest.fn());

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
                          minimumTime: 5,
                          parsingErrors: [new Error("c"), new Error("d")],
                          suggestedPresentationDelay: 100,
                          periods: [ newPeriod1,
                                     newPeriod2,
                                     newPeriod3,
                                     newPeriod4,
                                     newPeriod5 ],
                          transport: "foob",
                          uris: ["url3", "url4"] };

    manifest.replace(newManifest as any);

    expect(manifest.periods).toEqual([ newPeriod1,
                                       newPeriod2,
                                       newPeriod3,
                                       newPeriod4,
                                       newPeriod5 ]);

    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod1, newPeriod2, 0);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod2, newPeriod4, 0);
    expect(eeSpy).toHaveBeenCalledTimes(1);
    expect(eeSpy).toHaveBeenCalledWith("manifestUpdate", null);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(2);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    // expect(fakeLogger.info).toHaveBeenCalledTimes(5);
    eeSpy.mockRestore();
  });
});
/* tslint:enable no-unsafe-any */
