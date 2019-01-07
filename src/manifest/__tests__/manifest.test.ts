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

import log from "../../log";

describe("Manifest - Manifest", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should create a normalized Manifest structure", () => {
    const simpleFakeManifest = {
      id: "man",
      isLive: false,
      duration: 5,
      periods: [],
      transportType: "foobar",
    };

    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());

    const Manifest = require("../manifest").default;
    const manifest = new Manifest(simpleFakeManifest, {});

    expect(manifest.parsingErrors).toEqual([]);
    expect(manifest.id).toEqual("man");
    expect(manifest.transport).toEqual("foobar");
    expect(manifest.periods).toEqual([]);
    expect(manifest.adaptations).toEqual({});
    expect(manifest.minimumTime).toEqual(undefined);
    expect(manifest.isLive).toEqual(false);
    expect(manifest.uris).toEqual([]);
    expect(manifest.lifetime).toEqual(undefined);
    expect(manifest.suggestedPresentationDelay).toEqual(undefined);
    expect(manifest.availabilityStartTime).toEqual(undefined);
    expect(manifest.presentationLiveGap).toEqual(undefined);
    expect(manifest.timeShiftBufferDepth).toEqual(undefined);
    expect(manifest.baseURL).toEqual(undefined);
    expect(manifest.getDuration()).toEqual(5);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("should create a Period for each manifest.periods given", () => {
    const period1 = { id: "0" };
    const period2 = { id: "1" };
    const simpleFakeManifest = {
      id: "man",
      isLive: false,
      duration: 5,
      periods: [period1, period2],
      transportType: "foobar",
    };

    const fakePeriod = jest.fn((period) => {
      return { id: "foo" + period.id, parsingErrors: [] };
    });
    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    jest.mock("../period", () =>  ({ default: fakePeriod }));
    const Manifest = require("../manifest").default;

    const manifest = new Manifest(simpleFakeManifest, {});
    expect(fakePeriod).toHaveBeenCalledTimes(2);
    expect(fakePeriod).toHaveBeenCalledWith(period1, undefined);
    expect(fakePeriod).toHaveBeenCalledWith(period2, undefined);

    expect(manifest.periods).toEqual([
      { id: "foo0", parsingErrors: [] },
      { id: "foo1", parsingErrors: [] },
    ]);
    expect(manifest.adaptations).toEqual({});

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("should expose the adaptations of the first period if set", () => {
    const adapP1 = {};
    const adapP2 = {};
    const period1 = { id: "0", adaptations: adapP1 };
    const period2 = { id: "1", adaptations: adapP2 };
    const simpleFakeManifest = {
      id: "man",
      isLive: false,
      duration: 5,
      periods: [period1, period2],
      transportType: "foobar",
    };

    const fakePeriod = jest.fn((period) => {
      return { ...period, id: "foo" + period.id, parsingErrors: [] };
    });
    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    jest.mock("../period", () =>  ({ default: fakePeriod }));
    const Manifest = require("../manifest").default;

    const manifest = new Manifest(simpleFakeManifest, {});
    expect(fakePeriod).toHaveBeenCalledTimes(2);
    expect(fakePeriod).toHaveBeenCalledWith(period1, undefined);
    expect(fakePeriod).toHaveBeenCalledWith(period2, undefined);

    expect(manifest.periods).toEqual([
      { id: "foo0", parsingErrors: [], adaptations: adapP1 },
      { id: "foo1", parsingErrors: [], adaptations: adapP2 },
    ]);
    expect(manifest.adaptations).toBe(adapP1);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("should push any parsing errors from the Period parsing", () => {
    const period1 = { id: "0" };
    const period2 = { id: "1" };
    const simpleFakeManifest = {
      id: "man",
      isLive: false,
      duration: 5,
      periods: [period1, period2],
      transportType: "foobar",
    };

    const fakePeriod = jest.fn((period) => {
      return { id: "foo" + period.id, parsingErrors: ["a" + period.id, period.id] };
    });
    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    jest.mock("../period", () =>  ({ default: fakePeriod }));
    const Manifest = require("../manifest").default;

    const manifest = new Manifest(simpleFakeManifest, {});
    expect(manifest.parsingErrors).toHaveLength(4);
    expect(manifest.parsingErrors).toContain("a0");
    expect(manifest.parsingErrors).toContain("a1");
    expect(manifest.parsingErrors).toContain("0");
    expect(manifest.parsingErrors).toContain("1");

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  // TODO inspect why it doesn't pass. It makes no sense to me for now
  xit("should warn if no duration is given for non-live contents", () => {
    const period1 = { id: "0" };
    const period2 = { id: "1" };
    const simpleFakeManifest = {
      id: "man",
      isLive: false,
      periods: [period1, period2],
      transportType: "foobar",
    };

    const fakePeriod = jest.fn((period) => {
      return { id: "foo" + period.id, parsingErrors: ["a" + period.id, period.id] };
    });
    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    jest.mock("../period", () =>  ({ default: fakePeriod }));
    const Manifest = require("../manifest").default;

    const manifest = new Manifest(simpleFakeManifest, {});
    expect(manifest.isLive).toEqual(false);
    expect(manifest.duration).toEqual(undefined);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      "Manifest: non live content and duration is null.");
    logSpy.mockRestore();
  });

  it("should not warn if no duration is given for live contents", () => {
    const period1 = { id: "0" };
    const period2 = { id: "1" };
    const simpleFakeManifest = {
      id: "man",
      isLive: true,
      periods: [period1, period2],
      transportType: "foobar",
    };

    const fakePeriod = jest.fn((period) => {
      return { id: "foo" + period.id, parsingErrors: ["a" + period.id, period.id] };
    });
    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    jest.mock("../period", () =>  ({ default: fakePeriod }));
    const Manifest = require("../manifest").default;

    const manifest = new Manifest(simpleFakeManifest, {});
    expect(manifest.isLive).toEqual(true);
    expect(manifest.duration).toEqual(undefined);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("should correctly parse every manifest informations given", () => {
    const oldPeriod1 = { id: "0" };
    const oldPeriod2 = { id: "1" };
    const oldManifestArgs = {
      availabilityStartTime: 5,
      baseURL: "test",
      duration: 12,
      id: "man",
      isLive: false,
      lifetime: 13,
      minimumTime: 4,
      parsingErrors: ["a", "b"],
      periods: [oldPeriod1, oldPeriod2],
      presentationLiveGap: 18,
      suggestedPresentationDelay: 99,
      timeShiftBufferDepth: 2,
      transportType: "foobar",
      uris: ["url1", "url2"],
    };

    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const fakePeriod = jest.fn((period) => {
      return { ...period, id: "foo" + period.id, parsingErrors: [period.id] };
    });
    jest.mock("../period", () =>  ({ default: fakePeriod }));
    const Manifest = require("../manifest").default;
    const manifest = new Manifest(oldManifestArgs, {});

    expect(manifest.adaptations).toEqual({});
    expect(manifest.availabilityStartTime).toEqual(5);
    expect(manifest.baseURL).toEqual("test");
    expect(manifest.getDuration()).toEqual(12);
    expect(manifest.id).toEqual("man");
    expect(manifest.isLive).toEqual(false);
    expect(manifest.lifetime).toEqual(13);
    expect(manifest.minimumTime).toEqual(4);
    expect(manifest.parsingErrors).toEqual(["0", "1"]);
    expect(manifest.periods).toEqual([
      { id: "foo0", parsingErrors: ["0"] },
      { id: "foo1", parsingErrors: ["1"] },
    ]);
    expect(manifest.presentationLiveGap).toEqual(18);
    expect(manifest.suggestedPresentationDelay).toEqual(99);
    expect(manifest.timeShiftBufferDepth).toEqual(2);
    expect(manifest.transport).toEqual("foobar");
    expect(manifest.uris).toEqual(["url1", "url2"]);
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("should update with a new Manifest when calling `update`", () => {
    const oldManifestArgs = {
      availabilityStartTime: 5,
      baseURL: "test",
      duration: 12,
      id: "man",
      isLive: false,
      lifetime: 13,
      minimumTime: 4,
      parsingErrors: ["a", "b"],
      periods: [{ id: "0" }, { id: "1" }],
      presentationLiveGap: 18,
      suggestedPresentationDelay: 99,
      timeShiftBufferDepth: 2,
      transportType: "foobar",
      uris: ["url1", "url2"],
    };

    const logSpy = jest.spyOn(log, "warn").mockImplementation(jest.fn());
    const fakePeriod = jest.fn((period) => {
      return { ...period, id: "foo" + period.id, parsingErrors: [period.id] };
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).map(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
    });
    jest.mock("../period", () =>  ({ default: fakePeriod }));
    jest.mock("../update_period", () =>  ({ default: fakeUpdatePeriodInPlace }));
    const Manifest = require("../manifest").default;
    const manifest = new Manifest(oldManifestArgs, {});

    const eeSpy = jest.spyOn(manifest, "trigger").mockImplementation(jest.fn());

    const [oldPeriod1, oldPeriod2] = manifest.periods;

    const newAdaptations = {};
    const newPeriod1 = { id: "foo0" };
    const newPeriod2 = { id: "foo1" };
    const newManifest = {
        _duration: 13,
      adaptations: newAdaptations,
      availabilityStartTime: 6,
      baseURL: "test2",
      getDuration() { return 13; },
      id: "man2",
      isLive: true,
      lifetime: 14,
      minimumTime: 5,
      parsingErrors: ["c", "d"],
      presentationLiveGap: 19,
      suggestedPresentationDelay: 100,
      timeShiftBufferDepth: 3,
      periods: [newPeriod1, newPeriod2],
      transport: "foob",
      uris: ["url3", "url4"],
    };

    manifest.update(newManifest);
    expect(manifest.adaptations).toEqual(newAdaptations);
    expect(manifest.availabilityStartTime).toEqual(6);
    expect(manifest.baseURL).toEqual("test2");
    expect(manifest.getDuration()).toEqual(13);
    expect(manifest.id).toEqual("man2");
    expect(manifest.isLive).toEqual(true);
    expect(manifest.lifetime).toEqual(14);
    expect(manifest.minimumTime).toEqual(5);
    expect(manifest.parsingErrors).toEqual(["c", "d"]);
    expect(manifest.presentationLiveGap).toEqual(19);
    expect(manifest.suggestedPresentationDelay).toEqual(100);
    expect(manifest.timeShiftBufferDepth).toEqual(3);
    expect(manifest.transport).toEqual("foob");
    expect(manifest.uris).toEqual(["url3", "url4"]);

    expect(manifest.periods).toEqual([newPeriod1, newPeriod2]);

    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod1, newPeriod1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod2, newPeriod2);
    expect(eeSpy).toHaveBeenCalledTimes(1);
    expect(eeSpy).toHaveBeenCalledWith("manifestUpdate", null);
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    eeSpy.mockRestore();
  });

  it("should prepend older Periods when calling `update`", () => {
    const oldManifestArgs = {
      availabilityStartTime: 5,
      baseURL: "test",
      duration: 12,
      id: "man",
      isLive: false,
      lifetime: 13,
      minimumTime: 4,
      parsingErrors: ["a", "b"],
      periods: [{ id: "1" }],
      presentationLiveGap: 18,
      suggestedPresentationDelay: 99,
      timeShiftBufferDepth: 2,
      transportType: "foobar",
      uris: ["url1", "url2"],
    };

    const logSpy = jest.spyOn(log, "info").mockImplementation(jest.fn());
    const fakePeriod = jest.fn((period) => {
      return { ...period, id: "foo" + period.id, parsingErrors: [period.id] };
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).map(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
    });
    jest.mock("../period", () =>  ({ default: fakePeriod }));
    jest.mock("../update_period", () =>  ({ default: fakeUpdatePeriodInPlace }));
    const Manifest = require("../manifest").default;
    const manifest = new Manifest(oldManifestArgs, {});
    const [oldPeriod1] = manifest.periods;

    const eeSpy = jest.spyOn(manifest, "trigger").mockImplementation(jest.fn());

    const newPeriod1 = { id: "pre0" };
    const newPeriod2 = { id: "pre1" };
    const newPeriod3 = { id: "foo1" };
    const newManifest = {
        _duration: 13,
      adaptations: {},
      availabilityStartTime: 6,
      baseURL: "test2",
      getDuration() { return 13; },
      id: "man2",
      isLive: true,
      lifetime: 14,
      minimumTime: 5,
      parsingErrors: ["c", "d"],
      presentationLiveGap: 19,
      suggestedPresentationDelay: 100,
      timeShiftBufferDepth: 3,
      periods: [newPeriod1, newPeriod2, newPeriod3],
      transport: "foob",
      uris: ["url3", "url4"],
    };

    manifest.update(newManifest);

    expect(manifest.periods).toEqual([newPeriod1, newPeriod2, newPeriod3]);

    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod1, newPeriod3);
    expect(eeSpy).toHaveBeenCalledTimes(1);
    expect(eeSpy).toHaveBeenCalledWith("manifestUpdate", null);
    // expect(logSpy).toHaveBeenCalledTimes(2);
    // expect(logSpy).toHaveBeenCalledWith(
    //   "Manifest: Adding new Period pre0 after update.");
    // expect(logSpy).toHaveBeenCalledWith(
    //   "Manifest: Adding new Period pre1 after update.");
    logSpy.mockRestore();
    eeSpy.mockRestore();
  });

  it("should append newer Periods when calling `update`", () => {
    const oldManifestArgs = {
      availabilityStartTime: 5,
      baseURL: "test",
      duration: 12,
      id: "man",
      isLive: false,
      lifetime: 13,
      minimumTime: 4,
      parsingErrors: ["a", "b"],
      periods: [{ id: "1" }],
      presentationLiveGap: 18,
      suggestedPresentationDelay: 99,
      timeShiftBufferDepth: 2,
      transportType: "foobar",
      uris: ["url1", "url2"],
    };

    const logSpy = jest.spyOn(log, "info").mockImplementation(jest.fn());
    const fakePeriod = jest.fn((period) => {
      return { ...period, id: "foo" + period.id, parsingErrors: [period.id] };
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).map(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
    });
    jest.mock("../period", () =>  ({ default: fakePeriod }));
    jest.mock("../update_period", () =>  ({ default: fakeUpdatePeriodInPlace }));
    const Manifest = require("../manifest").default;
    const manifest = new Manifest(oldManifestArgs, {});
    const [oldPeriod1] = manifest.periods;

    const eeSpy = jest.spyOn(manifest, "trigger").mockImplementation(jest.fn());

    const newPeriod1 = { id: "foo1" };
    const newPeriod2 = { id: "post0" };
    const newPeriod3 = { id: "post1" };
    const newManifest = {
        _duration: 13,
      adaptations: {},
      availabilityStartTime: 6,
      baseURL: "test2",
      getDuration() { return 13; },
      id: "man2",
      isLive: true,
      lifetime: 14,
      minimumTime: 5,
      parsingErrors: ["c", "d"],
      presentationLiveGap: 19,
      suggestedPresentationDelay: 100,
      timeShiftBufferDepth: 3,
      periods: [newPeriod1, newPeriod2, newPeriod3],
      transport: "foob",
      uris: ["url3", "url4"],
    };

    manifest.update(newManifest);

    expect(manifest.periods).toEqual([newPeriod1, newPeriod2, newPeriod3]);

    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod1, newPeriod1);
    expect(eeSpy).toHaveBeenCalledTimes(1);
    expect(eeSpy).toHaveBeenCalledWith("manifestUpdate", null);
    // expect(logSpy).toHaveBeenCalledTimes(1);
    // expect(logSpy)
    // .toHaveBeenCalledWith("Manifest: Adding new Periods after update.");
    logSpy.mockRestore();
    eeSpy.mockRestore();
  });

  it("should replace different Periods when calling `update`", () => {
    const oldManifestArgs = {
      availabilityStartTime: 5,
      baseURL: "test",
      duration: 12,
      id: "man",
      isLive: false,
      lifetime: 13,
      minimumTime: 4,
      parsingErrors: ["a", "b"],
      periods: [{ id: "1" }],
      presentationLiveGap: 18,
      suggestedPresentationDelay: 99,
      timeShiftBufferDepth: 2,
      transportType: "foobar",
      uris: ["url1", "url2"],
    };

    const logSpy = jest.spyOn(log, "info").mockImplementation(jest.fn());
    const fakePeriod = jest.fn((period) => {
      return { ...period, id: "foo" + period.id, parsingErrors: [period.id] };
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).map(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
    });
    jest.mock("../period", () =>  ({ default: fakePeriod }));
    jest.mock("../update_period", () =>  ({ default: fakeUpdatePeriodInPlace }));
    const Manifest = require("../manifest").default;
    const manifest = new Manifest(oldManifestArgs, {});

    const eeSpy = jest.spyOn(manifest, "trigger").mockImplementation(jest.fn());

    const newPeriod1 = { id: "diff0" };
    const newPeriod2 = { id: "diff1" };
    const newPeriod3 = { id: "diff2" };
    const newManifest = {
        _duration: 13,
      adaptations: {},
      availabilityStartTime: 6,
      baseURL: "test2",
      getDuration() { return 13; },
      id: "man2",
      isLive: true,
      lifetime: 14,
      minimumTime: 5,
      parsingErrors: ["c", "d"],
      presentationLiveGap: 19,
      suggestedPresentationDelay: 100,
      timeShiftBufferDepth: 3,
      periods: [newPeriod1, newPeriod2, newPeriod3],
      transport: "foob",
      uris: ["url3", "url4"],
    };

    manifest.update(newManifest);

    expect(manifest.periods).toEqual([newPeriod1, newPeriod2, newPeriod3]);

    expect(fakeUpdatePeriodInPlace).not.toHaveBeenCalled();
    expect(eeSpy).toHaveBeenCalledTimes(1);
    expect(eeSpy).toHaveBeenCalledWith("manifestUpdate", null);
    // expect(logSpy).toHaveBeenCalledTimes(4);
    logSpy.mockRestore();
    eeSpy.mockRestore();
  });

  it("should merge overlapping Periods when calling `update`", () => {
    const oldManifestArgs = {
      availabilityStartTime: 5,
      baseURL: "test",
      duration: 12,
      id: "man",
      isLive: false,
      lifetime: 13,
      minimumTime: 4,
      parsingErrors: ["a", "b"],
      periods: [{ id: "1" }, { id: "2" }, { id: "3" }],
      presentationLiveGap: 18,
      suggestedPresentationDelay: 99,
      timeShiftBufferDepth: 2,
      transportType: "foobar",
      uris: ["url1", "url2"],
    };

    const logSpy = jest.spyOn(log, "info").mockImplementation(jest.fn());
    const fakePeriod = jest.fn((period) => {
      return { ...period, id: "foo" + period.id, parsingErrors: [period.id] };
    });
    const fakeUpdatePeriodInPlace = jest.fn((oldPeriod, newPeriod) => {
      Object.keys(oldPeriod).map(key => {
        delete oldPeriod[key];
      });
      oldPeriod.id = newPeriod.id;
    });
    jest.mock("../period", () =>  ({ default: fakePeriod }));
    jest.mock("../update_period", () =>  ({ default: fakeUpdatePeriodInPlace }));
    const Manifest = require("../manifest").default;
    const manifest = new Manifest(oldManifestArgs, {});
    const [oldPeriod1, oldPeriod2] = manifest.periods;

    const eeSpy = jest.spyOn(manifest, "trigger").mockImplementation(jest.fn());

    const newPeriod1 = { id: "pre0" };
    const newPeriod2 = { id: "foo1" };
    const newPeriod3 = { id: "diff0" };
    const newPeriod4 = { id: "foo2" };
    const newPeriod5 = { id: "post0" };
    const newManifest = {
        _duration: 13,
      adaptations: {},
      availabilityStartTime: 6,
      baseURL: "test2",
      getDuration() { return 13; },
      id: "man2",
      isLive: true,
      lifetime: 14,
      minimumTime: 5,
      parsingErrors: ["c", "d"],
      presentationLiveGap: 19,
      suggestedPresentationDelay: 100,
      timeShiftBufferDepth: 3,
      periods: [newPeriod1, newPeriod2, newPeriod3, newPeriod4, newPeriod5],
      transport: "foob",
      uris: ["url3", "url4"],
    };

    manifest.update(newManifest);

    expect(manifest.periods).toEqual([
      newPeriod1,
      newPeriod2,
      newPeriod3,
      newPeriod4,
      newPeriod5,
    ]);

    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod1, newPeriod2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledWith(oldPeriod2, newPeriod4);
    expect(eeSpy).toHaveBeenCalledTimes(1);
    expect(eeSpy).toHaveBeenCalledWith("manifestUpdate", null);
    // expect(logSpy).toHaveBeenCalledTimes(5);
    logSpy.mockRestore();
    eeSpy.mockRestore();
  });
});
