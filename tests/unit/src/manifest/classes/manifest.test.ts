import { describe, beforeEach, it, expect, vi } from "vitest";
import CodecSupportCache from "../../../../../src/manifest/classes/codec_support_cache.ts";
import Manifest from "../../../../../src/manifest/classes/manifest.ts";
import type IPeriod from "../../../../../src/manifest/classes/period.ts";
import type {
  IParsedAdaptation,
  IParsedPeriod,
  IParsedRepresentation,
} from "../../../../../src/parsers/manifest/index.ts";
import getMonotonicTimeStamp from "../../../../../src/utils/monotonic_timestamp.ts";

const mocks = vi.hoisted(() => {
  const fakeGenerateNewId = vi.fn(() => "fakeId");
  const fakeIdGenerator = vi.fn(() => fakeGenerateNewId);
  const fakePeriod = vi.fn();
  const fakeReplacePeriods = vi.fn();
  const fakeLogger = {
    warn: vi.fn(() => undefined),
    info: vi.fn(() => undefined),
  };
  return {
    fakeLogger,
    fakeGenerateNewId,
    fakeIdGenerator,
    fakePeriod,
    fakeReplacePeriods,
  };
});

vi.mock("../../../../../src/log", () => {
  return {
    default: mocks.fakeLogger,
  };
});
vi.mock("../../../../../src/utils/id_generator", () => ({
  default: mocks.fakeIdGenerator,
}));
vi.mock("../../../../../src/manifest/classes/period", () => ({
  default: mocks.fakePeriod,
}));
vi.mock("../../../../../src/manifest/classes/update_periods", async () => {
  const updatePeriods = (
    await vi.importActual("../../../../../src/manifest/classes/update_periods")
  ).updatePeriods;
  return {
    replacePeriods: mocks.fakeReplacePeriods,
    updatePeriods,
  };
});

function generateParsedPeriod(
  id: string,
  start: number,
  end: number | undefined,
): IParsedPeriod {
  const adaptations = { audio: [generateParsedAudioAdaptation(id)] };
  return {
    id,
    start,
    end,
    adaptations,
    duration: end === undefined ? undefined : end - start,
    streamEvents: [],
    thumbnailTracks: [],
  };
}
function generateParsedAudioAdaptation(id: string): IParsedAdaptation {
  return {
    id,
    type: "audio",
    representations: [generateParsedRepresentation(id)],
  };
}
function generateParsedRepresentation(id: string): IParsedRepresentation {
  return { id, bitrate: 100 } as IParsedRepresentation;
}

describe("Manifest - Manifest", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.fakeLogger.warn.mockReset();
    mocks.fakeLogger.info.mockReset();
    mocks.fakeGenerateNewId.mockReset();
    mocks.fakeIdGenerator.mockReset();
    mocks.fakePeriod.mockReset();
    mocks.fakeReplacePeriods.mockReset();
    mocks.fakeGenerateNewId.mockImplementation(() => "fakeId");
    mocks.fakeIdGenerator.mockImplementation(() => mocks.fakeGenerateNewId);
  });

  it("should create a normalized Manifest structure", () => {
    const simpleFakeManifest = {
      id: "man",
      transportType: "dash",
      isLastPeriodKnown: true,
      isDynamic: false,
      isLive: false,
      duration: 5,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          livePosition: 10,
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      periods: [],
      refreshUrls: [],
      contentSteering: null,
    };

    const manifest = new Manifest(simpleFakeManifest, {});

    expect(manifest.adaptations).toEqual({});
    expect(manifest.availabilityStartTime).toEqual(undefined);
    expect(manifest.id).toEqual("fakeId");
    expect(manifest.isDynamic).toEqual(false);
    expect(manifest.isLive).toEqual(false);
    expect(manifest.lifetime).toEqual(undefined);
    expect(manifest.getMaximumSafePosition()).toEqual(10);
    expect(manifest.getMinimumSafePosition()).toEqual(0);
    expect(manifest.periods).toEqual([]);
    expect(manifest.suggestedPresentationDelay).toEqual(undefined);
    expect(manifest.refreshUrls).toEqual([]);

    expect(mocks.fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(mocks.fakeLogger.info).not.toHaveBeenCalled();
    expect(mocks.fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should create a Period for each manifest.periods given", () => {
    const period1 = generateParsedPeriod("0", 4, undefined);
    const period2 = generateParsedPeriod("1", 12, undefined);
    const simpleFakeManifest = {
      id: "man",
      transportType: "dash",
      isLastPeriodKnown: true,
      isDynamic: false,
      isLive: false,
      duration: 5,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          livePosition: 10,
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      periods: [period1, period2],
      refreshUrls: [],
      contentSteering: null,
    };

    mocks.fakePeriod.mockImplementation(function (period: IPeriod) {
      return { id: `foo${period.id}`, adaptations: period.adaptations };
    });

    const manifest = new Manifest(simpleFakeManifest, {});
    expect(mocks.fakePeriod).toHaveBeenCalledTimes(2);
    expect(mocks.fakePeriod).toHaveBeenCalledWith(
      period1,
      new CodecSupportCache([]),
      undefined,
    );
    expect(mocks.fakePeriod).toHaveBeenCalledWith(
      period2,
      new CodecSupportCache([]),
      undefined,
    );

    expect(manifest.periods).toEqual([
      { id: "foo0", adaptations: period1.adaptations },
      { id: "foo1", adaptations: period2.adaptations },
    ]);
    expect(manifest.adaptations).toEqual(period1.adaptations);

    expect(mocks.fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(mocks.fakeLogger.info).not.toHaveBeenCalled();
    expect(mocks.fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should pass a `representationFilter` to the Period if given", () => {
    const period1 = generateParsedPeriod("0", 4, undefined);
    const period2 = generateParsedPeriod("1", 12, undefined);
    const simpleFakeManifest = {
      id: "man",
      isDynamic: false,
      transportType: "dash",
      isLastPeriodKnown: true,
      isLive: false,
      duration: 5,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          livePosition: 10,
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      periods: [period1, period2],
      refreshUrls: [],
      contentSteering: null,
    };

    const representationFilter = function () {
      return false;
    };

    mocks.fakePeriod.mockImplementation(function (period: IParsedPeriod): IPeriod {
      return { id: `foo${period.id}` } as IPeriod;
    });

    const manifest = new Manifest(simpleFakeManifest, {
      representationFilter,
    });
    expect(manifest).not.toBe(null);

    expect(mocks.fakePeriod).toHaveBeenCalledTimes(2);
    expect(mocks.fakePeriod).toHaveBeenCalledWith(
      period1,
      new CodecSupportCache([]),
      representationFilter,
    );
    expect(mocks.fakePeriod).toHaveBeenCalledWith(
      period2,
      new CodecSupportCache([]),
      representationFilter,
    );
    expect(mocks.fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(mocks.fakeLogger.info).not.toHaveBeenCalled();
    expect(mocks.fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should expose the adaptations of the first period if set", () => {
    const adapP1 = {};
    const adapP2 = {};
    const period1 = { id: "0", start: 4, adaptations: adapP1, thumbnailTracks: [] };
    const period2 = { id: "1", start: 12, adaptations: adapP2, thumbnailTracks: [] };
    const simpleFakeManifest = {
      id: "man",
      isDynamic: false,
      transportType: "dash",
      isLastPeriodKnown: true,
      isLive: false,
      duration: 5,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          livePosition: 10,
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      periods: [period1, period2],
      refreshUrls: [],
      contentSteering: null,
    };

    mocks.fakePeriod.mockImplementation(function (period: IParsedPeriod): IPeriod {
      return { ...period, id: `foo${period.id}` } as unknown as IPeriod;
    });

    const manifest = new Manifest(simpleFakeManifest, {});
    expect(mocks.fakePeriod).toHaveBeenCalledTimes(2);
    expect(mocks.fakePeriod).toHaveBeenCalledWith(
      period1,
      new CodecSupportCache([]),
      undefined,
    );
    expect(mocks.fakePeriod).toHaveBeenCalledWith(
      period2,
      new CodecSupportCache([]),
      undefined,
    );

    expect(manifest.periods).toEqual([
      { id: "foo0", start: 4, adaptations: adapP1, thumbnailTracks: [] },
      { id: "foo1", start: 12, adaptations: adapP2, thumbnailTracks: [] },
    ]);
    expect(manifest.adaptations).toBe(adapP1);

    expect(mocks.fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(mocks.fakeLogger.info).not.toHaveBeenCalled();
    expect(mocks.fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should correctly parse every manifest information given", async () => {
    const oldPeriod1 = generateParsedPeriod("0", 4, undefined);
    const oldPeriod2 = generateParsedPeriod("1", 12, undefined);
    const time = getMonotonicTimeStamp();
    const oldManifestArgs = {
      availabilityStartTime: 5,
      duration: 12,
      id: "man",
      transportType: "dash",
      isLastPeriodKnown: true,
      isDynamic: false,
      isLive: false,
      lifetime: 13,
      periods: [oldPeriod1, oldPeriod2],
      timeBounds: {
        minimumSafePosition: 5,
        timeshiftDepth: null,
        maximumTimeData: {
          livePosition: 10,
          isLinear: false,
          maximumSafePosition: 10,
          time,
        },
      },
      suggestedPresentationDelay: 99,
      refreshUrls: [{ baseUrl: "url1" }, { baseUrl: "url2" }],
      contentSteering: null,
    };

    mocks.fakePeriod.mockImplementation(function (period: IParsedPeriod): IPeriod {
      return { ...period, id: `foo${period.id}` } as unknown as IPeriod;
    });
    const manifest = new Manifest(oldManifestArgs, {});

    expect(manifest.adaptations).toEqual(oldPeriod1.adaptations);
    expect(manifest.availabilityStartTime).toEqual(5);
    expect(manifest.id).toEqual("fakeId");
    expect(manifest.isDynamic).toEqual(false);
    expect(manifest.isLive).toEqual(false);
    expect(manifest.lifetime).toEqual(13);

    expect(manifest.getMaximumSafePosition()).toEqual(10);
    expect(manifest.getMinimumSafePosition()).toEqual(5);
    expect(manifest.periods).toEqual([
      {
        id: "foo0",
        adaptations: oldPeriod1.adaptations,
        start: 4,
        streamEvents: [],
        thumbnailTracks: [],
      },
      {
        id: "foo1",
        adaptations: oldPeriod2.adaptations,
        start: 12,
        streamEvents: [],
        thumbnailTracks: [],
      },
    ]);
    expect(manifest.suggestedPresentationDelay).toEqual(99);
    expect(manifest.refreshUrls).toEqual([
      { baseUrl: "url1" },
      { baseUrl: "url2" },
    ]);
    expect(mocks.fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(mocks.fakeLogger.info).not.toHaveBeenCalled();
    expect(mocks.fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should return all URLs given with `getRefreshUrls`", async () => {
    mocks.fakePeriod.mockImplementation(function (period: IParsedPeriod): IPeriod {
      return { ...period, id: `foo${period.id}` } as unknown as IPeriod;
    });

    const oldPeriod1 = generateParsedPeriod("0", 4, undefined);
    const oldPeriod2 = generateParsedPeriod("1", 12, undefined);
    const oldManifestArgs1 = {
      availabilityStartTime: 5,
      duration: 12,
      id: "man",
      isDynamic: false,
      isLive: false,
      transportType: "dash",
      isLastPeriodKnown: true,
      lifetime: 13,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          livePosition: 10,
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      periods: [oldPeriod1, oldPeriod2],
      suggestedPresentationDelay: 99,
      refreshUrls: [{ baseUrl: "url1" }, { baseUrl: "url2" }],
      contentSteering: null,
    };

    const manifest1 = new Manifest(oldManifestArgs1, {});
    expect(manifest1.getRefreshUrls()).toEqual(["url1", "url2"]);

    const oldManifestArgs2 = {
      availabilityStartTime: 5,
      duration: 12,
      id: "man",
      isDynamic: false,
      isLive: false,
      transportType: "dash",
      isLastPeriodKnown: true,
      lifetime: 13,
      periods: [
        { id: "0", start: 4, adaptations: oldPeriod1.adaptations, thumbnailTracks: [] },
        { id: "1", start: 12, adaptations: oldPeriod2.adaptations, thumbnailTracks: [] },
      ],
      suggestedPresentationDelay: 99,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          livePosition: 10,
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      refreshUrls: [],
      contentSteering: null,
    };
    const manifest2 = new Manifest(oldManifestArgs2, {});
    expect(manifest2.getRefreshUrls()).toEqual([]);
  });

  it("should replace with a new Manifest when calling `replace`", async () => {
    mocks.fakePeriod.mockImplementation(function (period: IParsedPeriod): IPeriod {
      return { ...period, id: `foo${period.id}` } as unknown as IPeriod;
    });
    const fakeReplacePeriodsRes = {
      updatedPeriods: [],
      addedPeriods: [],
      removedPeriods: [],
    };
    mocks.fakeReplacePeriods.mockImplementation(() => fakeReplacePeriodsRes);
    const oldPeriod1 = generateParsedPeriod("0", 4, undefined);
    const oldPeriod2 = generateParsedPeriod("1", 12, undefined);
    const oldManifestArgs = {
      availabilityStartTime: 5,
      duration: 12,
      id: "man",
      transportType: "dash",
      isLastPeriodKnown: true,
      isDynamic: false,
      isLive: false,
      lifetime: 13,
      periods: [oldPeriod1, oldPeriod2],
      timeBounds: {
        minimumSafePosition: 7,
        timeshiftDepth: 10,
        maximumTimeData: {
          livePosition: 10,
          isLinear: true,
          maximumSafePosition: 30,
          time: 30000,
        },
      },
      suggestedPresentationDelay: 99,
      refreshUrls: [{ baseUrl: "url1" }, { baseUrl: "url2" }],
      contentSteering: null,
    };

    const manifest = new Manifest(oldManifestArgs, {});

    const mockTrigger = vi
      .spyOn(
        manifest as Manifest & {
          trigger: (eventName: string, payload: unknown) => void;
        },
        "trigger",
      )
      .mockImplementation(vi.fn());

    const newAdaptations = {};
    const newPeriod1 = {
      id: "foo0",
      start: 4,
      adaptations: { audio: oldPeriod1.adaptations },
    };
    const newPeriod2 = {
      id: "foo1",
      start: 12,
      adaptations: { audio: oldPeriod2.adaptations },
    };
    const newManifest = {
      adaptations: newAdaptations,
      availabilityStartTime: 6,
      id: "man2",
      isDynamic: true,
      isLive: true,
      lifetime: 14,
      suggestedPresentationDelay: 100,
      timeShiftBufferDepth: 3,
      _timeBounds: {
        minimumSafePosition: 7,
        timeshiftDepth: 5,
        maximumTimeData: {
          isLinear: false,
          maximumSafePosition: 40,
          time: 30000,
        },
      },
      periods: [newPeriod1, newPeriod2],
      refreshUrls: [{ baseUrl: "url3" }, { baseUrl: "url4" }],
    } as unknown as Manifest;

    manifest.replace(newManifest);
    expect(mocks.fakeReplacePeriods).toHaveBeenCalledTimes(1);
    expect(mocks.fakeReplacePeriods).toHaveBeenCalledWith(
      manifest.periods,
      newManifest.periods,
    );
    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith("manifestUpdate", fakeReplacePeriodsRes);
    expect(mocks.fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(mocks.fakeLogger.info).not.toHaveBeenCalled();
    expect(mocks.fakeLogger.warn).not.toHaveBeenCalled();
    mockTrigger.mockRestore();
  });
});
