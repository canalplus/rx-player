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
                                 timeBounds: { minimumSafePosition: 0,
                                               timeshiftDepth: null,
                                               maximumTimeData: {
                                                 isLinear: false,
                                                 maximumSafePosition: 10,
                                                 time: 10,
                                               } },
                                 periods: [] };

    const Manifest = jest.requireActual("../manifest").default;
    const manifest = new Manifest(simpleFakeManifest, {});

    expect(manifest.adaptations).toEqual({});
    expect(manifest.availabilityStartTime).toEqual(undefined);
    expect(manifest.id).toEqual("fakeId");
    expect(manifest.isDynamic).toEqual(false);
    expect(manifest.isLive).toEqual(false);
    expect(manifest.lifetime).toEqual(undefined);
    expect(manifest.getMaximumSafePosition()).toEqual(10);
    expect(manifest.getMinimumSafePosition()).toEqual(0);
    expect(manifest.contentWarnings).toEqual([]);
    expect(manifest.periods).toEqual([]);
    expect(manifest.suggestedPresentationDelay).toEqual(undefined);
    expect(manifest.uris).toEqual([]);

    expect(fakeIdGenerator).toHaveBeenCalledTimes(1);
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
                                 timeBounds: { minimumSafePosition: 0,
                                               timeshiftDepth: null,
                                               maximumTimeData: {
                                                 isLinear: false,
                                                 maximumSafePosition: 10,
                                                 time: 10,
                                               } },
                                 periods: [period1, period2] };

    const fakePeriod = jest.fn((period) => {
      return { id: `foo${period.id}`, adaptations: {}, contentWarnings: [] };
    });
    jest.mock("../period", () =>  ({ __esModule: true as const,
                                     default: fakePeriod }));

    const Manifest = jest.requireActual("../manifest").default;
    const manifest = new Manifest(simpleFakeManifest, {});
    expect(fakePeriod).toHaveBeenCalledTimes(2);
    expect(fakePeriod).toHaveBeenCalledWith(period1, undefined);
    expect(fakePeriod).toHaveBeenCalledWith(period2, undefined);

    expect(manifest.periods).toEqual([ { id: "foo0",
                                         adaptations: {},
                                         contentWarnings: [] },
                                       { id: "foo1",
                                         adaptations: {},
                                         contentWarnings: [] } ]);
    expect(manifest.adaptations).toEqual({});

    expect(fakeIdGenerator).toHaveBeenCalledTimes(1);
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
                                 timeBounds: { minimumSafePosition: 0,
                                               timeshiftDepth: null,
                                               maximumTimeData: {
                                                 isLinear: false,
                                                 maximumSafePosition: 10,
                                                 time: 10,
                                               } },
                                 periods: [period1, period2] };

    const representationFilter = function() { return false; };

    const fakePeriod = jest.fn((period) => {
      return { id: `foo${period.id}`, contentWarnings: [] };
    });
    jest.mock("../period", () =>  ({ __esModule: true as const,
                                     default: fakePeriod }));
    const Manifest = jest.requireActual("../manifest").default;

    /* eslint-disable @typescript-eslint/no-unused-expressions */
    new Manifest(simpleFakeManifest, { representationFilter });
    /* eslint-enable @typescript-eslint/no-unused-expressions */

    expect(fakePeriod).toHaveBeenCalledTimes(2);
    expect(fakePeriod).toHaveBeenCalledWith(period1, representationFilter);
    expect(fakePeriod).toHaveBeenCalledWith(period2, representationFilter);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(1);
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
                                 timeBounds: { minimumSafePosition: 0,
                                               timeshiftDepth: null,
                                               maximumTimeData: {
                                                 isLinear: false,
                                                 maximumSafePosition: 10,
                                                 time: 10,
                                               } },
                                 periods: [period1, period2] };

    const fakePeriod = jest.fn((period) => {
      return { ...period, id: `foo${period.id}`, contentWarnings: [] };
    });
    jest.mock("../period", () =>  ({ __esModule: true as const,
                                     default: fakePeriod }));
    const Manifest = jest.requireActual("../manifest").default;

    const manifest = new Manifest(simpleFakeManifest, {});
    expect(fakePeriod).toHaveBeenCalledTimes(2);
    expect(fakePeriod).toHaveBeenCalledWith(period1, undefined);
    expect(fakePeriod).toHaveBeenCalledWith(period2, undefined);

    expect(manifest.periods).toEqual([
      { id: "foo0", contentWarnings: [], start: 4, adaptations: adapP1 },
      { id: "foo1", contentWarnings: [], start: 12, adaptations: adapP2 },
    ]);
    expect(manifest.adaptations).toBe(adapP1);

    expect(fakeIdGenerator).toHaveBeenCalledTimes(1);
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
                                 timeBounds: { minimumSafePosition: 0,
                                               timeshiftDepth: null,
                                               maximumTimeData: {
                                                 isLinear: false,
                                                 maximumSafePosition: 10,
                                                 time: 10,
                                               } },
                                 periods: [period1, period2] };

    const fakePeriod = jest.fn((period) => {
      return { id: `foo${period.id}`,
               contentWarnings: [ new Error(`a${period.id}`),
                                  new Error(period.id) ] };
    });
    jest.mock("../period", () =>  ({
      __esModule: true as const,
      default: fakePeriod,
    }));
    const Manifest = jest.requireActual("../manifest").default;

    const manifest = new Manifest(simpleFakeManifest, {});
    expect(manifest.contentWarnings).toHaveLength(4);
    expect(manifest.contentWarnings).toContainEqual(new Error("a0"));
    expect(manifest.contentWarnings).toContainEqual(new Error("a1"));
    expect(manifest.contentWarnings).toContainEqual(new Error("0"));
    expect(manifest.contentWarnings).toContainEqual(new Error("1"));

    expect(fakeIdGenerator).toHaveBeenCalledTimes(1);
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
                              contentWarnings: [new Error("a"), new Error("b")],
                              periods: [oldPeriod1, oldPeriod2],
                              timeBounds: { minimumSafePosition: 5,
                                            timeshiftDepth: null,
                                            maximumTimeData: { isLinear: false,
                                                               maximumSafePosition: 10,
                                                               time } },
                              suggestedPresentationDelay: 99,
                              uris: ["url1", "url2"] };

    const fakePeriod = jest.fn((period) => {
      return { ...period,
               id: `foo${period.id}`,
               contentWarnings: [new Error(period.id)] };
    });
    jest.mock("../period", () =>  ({ __esModule: true as const,
                                     default: fakePeriod }));
    const Manifest = jest.requireActual("../manifest").default;
    const manifest = new Manifest(oldManifestArgs, {});

    expect(manifest.adaptations).toEqual({});
    expect(manifest.availabilityStartTime).toEqual(5);
    expect(manifest.id).toEqual("fakeId");
    expect(manifest.isDynamic).toEqual(false);
    expect(manifest.isLive).toEqual(false);
    expect(manifest.lifetime).toEqual(13);
    expect(manifest.contentWarnings).toEqual([new Error("0"), new Error("1")]);
    expect(manifest.getMaximumSafePosition()).toEqual(10);
    expect(manifest.getMinimumSafePosition()).toEqual(5);
    expect(manifest.periods).toEqual([
      { id: "foo0", contentWarnings: [new Error("0")], adaptations: {}, start: 4 },
      { id: "foo1", contentWarnings: [new Error("1")], adaptations: {}, start: 12 },
    ]);
    expect(manifest.suggestedPresentationDelay).toEqual(99);
    expect(manifest.uris).toEqual(["url1", "url2"]);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(1);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should return the first URL given with `getUrl`", () => {
    const fakePeriod = jest.fn((period) => {
      return {
        ...period,
        id: `foo${period.id}`,
        contentWarnings: [new Error(period.id)],
      };
    });
    jest.mock("../period", () =>  ({
      __esModule: true as const,
      default: fakePeriod,
    }));
    const Manifest = jest.requireActual("../manifest").default;

    const oldManifestArgs1 = { availabilityStartTime: 5,
                               duration: 12,
                               id: "man",
                               isDynamic: false,
                               isLive: false,
                               lifetime: 13,
                               timeBounds: { minimumSafePosition: 0,
                                             timeshiftDepth: null,
                                             maximumTimeData: {
                                               isLinear: false,
                                               maximumSafePosition: 10,
                                               time: 10,
                                             } },
                               contentWarnings: [new Error("a"), new Error("b")],
                               periods: [ { id: "0", start: 4, adaptations: {} },
                                          { id: "1", start: 12, adaptations: {} } ],
                               suggestedPresentationDelay: 99,
                               uris: ["url1", "url2"] };

    const manifest1 = new Manifest(oldManifestArgs1, {});
    expect(manifest1.getUrl()).toEqual("url1");

    const oldManifestArgs2 = { availabilityStartTime: 5,
                               duration: 12,
                               id: "man",
                               isDynamic: false,
                               isLive: false,
                               lifetime: 13,
                               contentWarnings: [new Error("a"), new Error("b")],
                               periods: [ { id: "0", start: 4, adaptations: {} },
                                          { id: "1", start: 12, adaptations: {} } ],
                               suggestedPresentationDelay: 99,
                               timeBounds: { minimumSafePosition: 0,
                                             timeshiftDepth: null,
                                             maximumTimeData: {
                                               isLinear: false,
                                               maximumSafePosition: 10,
                                               time: 10,
                                             } },
                               uris: [] };
    const manifest2 = new Manifest(oldManifestArgs2, {});
    expect(manifest2.getUrl()).toEqual(undefined);
  });

  it("should replace with a new Manifest when calling `replace`", () => {
    const fakePeriod = jest.fn((period) => ({ ...period,
                                              id: `foo${period.id}`,
                                              contentWarnings: [new Error(period.id)] }));
    const fakeReplacePeriodsRes = {
      updatedPeriods: [],
      addedPeriods: [],
      removedPeriods: [],
    };
    const fakeReplacePeriods = jest.fn(() => fakeReplacePeriodsRes);
    jest.mock("../period", () => ({ __esModule: true as const,
                                    default: fakePeriod }));
    jest.mock("../update_periods", () => ({
      __esModule: true as const,
      replacePeriods: fakeReplacePeriods,
    }));

    const oldManifestArgs = { availabilityStartTime: 5,
                              duration: 12,
                              id: "man",
                              isDynamic: false,
                              isLive: false,
                              lifetime: 13,
                              contentWarnings: [ new Error("a"),
                                                 new Error("b") ],
                              periods: [ { id: "0", start: 4, adaptations: {} },
                                         { id: "1", start: 12, adaptations: {} } ],
                              timeBounds: { minimumSafePosition: 7,
                                            timeshiftDepth: 10,
                                            maximumTimeData: {
                                              isLinear: true,
                                              maximumSafePosition: 30,
                                              time: 30000,
                                            } },
                              suggestedPresentationDelay: 99,
                              uris: ["url1", "url2"] };

    const Manifest = jest.requireActual("../manifest").default;
    const manifest = new Manifest(oldManifestArgs, {});

    const mockTrigger = jest.spyOn(manifest, "trigger").mockImplementation(jest.fn());

    const newAdaptations = {};
    const newPeriod1 = { id: "foo0", start: 4, adaptations: {} };
    const newPeriod2 = { id: "foo1", start: 12, adaptations: {} };
    const newManifest = { adaptations: newAdaptations,
                          availabilityStartTime: 6,
                          id: "man2",
                          isDynamic: true,
                          isLive: true,
                          lifetime: 14,
                          contentWarnings: [new Error("c"), new Error("d")],
                          suggestedPresentationDelay: 100,
                          timeShiftBufferDepth: 3,
                          _timeBounds: { minimumSafePosition: 7,
                                         timeshiftDepth: 5,
                                         maximumTimeData: {
                                           isLinear: false,
                                           maximumSafePosition: 40,
                                           time: 30000,
                                         } },
                          periods: [newPeriod1, newPeriod2],
                          uris: ["url3", "url4"] };

    manifest.replace(newManifest);
    expect(fakeReplacePeriods).toHaveBeenCalledTimes(1);
    expect(fakeReplacePeriods)
      .toHaveBeenCalledWith(manifest.periods, newManifest.periods);
    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith("manifestUpdate", fakeReplacePeriodsRes);
    expect(fakeIdGenerator).toHaveBeenCalledTimes(1);
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
    mockTrigger.mockRestore();
  });
});
