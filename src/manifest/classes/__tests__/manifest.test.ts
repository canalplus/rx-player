import { describe, beforeEach, it, expect, vi } from "vitest";
import type { IPlayerError } from "../../../public_types";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

function generateParsedPeriod(id: string, start: number, end: number | undefined) {
  const adaptations = { audio: [generateParsedAudioAdaptation(id)] };
  return { id, start, end, adaptations };
}
function generateParsedAudioAdaptation(id: string) {
  return {
    id,
    type: "audio",
    representations: [generateParsedRepresentation(id)],
  };
}
function generateParsedRepresentation(id: string) {
  return { id, bitrate: 100 };
}

describe("Manifest - Manifest", () => {
  const fakeLogger = {
    warn: vi.fn(() => undefined),
    info: vi.fn(() => undefined),
  };
  const fakeGenerateNewId = vi.fn(() => "fakeId");
  const fakeIdGenerator = vi.fn(() => fakeGenerateNewId);

  beforeEach(() => {
    vi.resetModules();
    fakeLogger.warn.mockClear();
    fakeLogger.info.mockClear();
    vi.doMock("../../../log", () => ({
      default: fakeLogger,
    }));
    fakeGenerateNewId.mockClear();
    fakeIdGenerator.mockClear();
    vi.doMock("../../../utils/id_generator", () => ({
      default: fakeIdGenerator,
    }));
  });

  it("should create a normalized Manifest structure", async () => {
    const simpleFakeManifest = {
      id: "man",
      isDynamic: false,
      isLive: false,
      duration: 5,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      periods: [],
    };

    const Manifest = ((await vi.importActual("../manifest")) as any).default;
    const warnings: IPlayerError[] = [];
    const manifest = new Manifest(simpleFakeManifest, {}, warnings);

    expect(manifest.adaptations).toEqual({});
    expect(manifest.availabilityStartTime).toEqual(undefined);
    expect(manifest.id).toEqual("fakeId");
    expect(manifest.isDynamic).toEqual(false);
    expect(manifest.isLive).toEqual(false);
    expect(manifest.lifetime).toEqual(undefined);
    expect(manifest.getMaximumSafePosition()).toEqual(10);
    expect(manifest.getMinimumSafePosition()).toEqual(0);
    expect(warnings).toEqual([]);
    expect(manifest.periods).toEqual([]);
    expect(manifest.suggestedPresentationDelay).toEqual(undefined);
    expect(manifest.uris).toEqual([]);

    expect(fakeIdGenerator).toHaveBeenCalled();
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should create a Period for each manifest.periods given", async () => {
    const period1 = generateParsedPeriod("0", 4, undefined);
    const period2 = generateParsedPeriod("1", 12, undefined);
    const simpleFakeManifest = {
      id: "man",
      isDynamic: false,
      isLive: false,
      duration: 5,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      periods: [period1, period2],
    };

    const fakePeriod = vi.fn((period) => {
      return { id: `foo${period.id}`, adaptations: period.adaptations };
    });
    vi.doMock("../period", () => ({
      default: fakePeriod,
    }));

    const Manifest = ((await vi.importActual("../manifest")) as any).default;
    const manifest = new Manifest(simpleFakeManifest, {}, []);
    expect(fakePeriod).toHaveBeenCalledTimes(2);
    expect(fakePeriod).toHaveBeenCalledWith(period1, [], undefined);
    expect(fakePeriod).toHaveBeenCalledWith(period2, [], undefined);

    expect(manifest.periods).toEqual([
      { id: "foo0", adaptations: period1.adaptations },
      { id: "foo1", adaptations: period2.adaptations },
    ]);
    expect(manifest.adaptations).toEqual(period1.adaptations);

    expect(fakeIdGenerator).toHaveBeenCalled();
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should pass a `representationFilter` to the Period if given", async () => {
    const period1 = generateParsedPeriod("0", 4, undefined);
    const period2 = generateParsedPeriod("1", 12, undefined);
    const simpleFakeManifest = {
      id: "man",
      isDynamic: false,
      isLive: false,
      duration: 5,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      periods: [period1, period2],
    };

    const representationFilter = function () {
      return false;
    };

    const fakePeriod = vi.fn((period) => {
      return { id: `foo${period.id}` };
    });
    vi.doMock("../period", () => ({
      default: fakePeriod,
    }));
    const Manifest = ((await vi.importActual("../manifest")) as any).default;

    /* eslint-disable @typescript-eslint/no-unused-expressions */
    new Manifest(simpleFakeManifest, { representationFilter }, []);
    /* eslint-enable @typescript-eslint/no-unused-expressions */

    expect(fakePeriod).toHaveBeenCalledTimes(2);
    expect(fakePeriod).toHaveBeenCalledWith(period1, [], representationFilter);
    expect(fakePeriod).toHaveBeenCalledWith(period2, [], representationFilter);
    expect(fakeIdGenerator).toHaveBeenCalled();
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should expose the adaptations of the first period if set", async () => {
    const adapP1 = {};
    const adapP2 = {};
    const period1 = { id: "0", start: 4, adaptations: adapP1 };
    const period2 = { id: "1", start: 12, adaptations: adapP2 };
    const simpleFakeManifest = {
      id: "man",
      isDynamic: false,
      isLive: false,
      duration: 5,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      periods: [period1, period2],
    };

    const fakePeriod = vi.fn((period) => {
      return { ...period, id: `foo${period.id}` };
    });
    vi.doMock("../period", () => ({
      default: fakePeriod,
    }));
    const Manifest = ((await vi.importActual("../manifest")) as any).default;

    const manifest = new Manifest(simpleFakeManifest, {}, []);
    expect(fakePeriod).toHaveBeenCalledTimes(2);
    expect(fakePeriod).toHaveBeenCalledWith(period1, [], undefined);
    expect(fakePeriod).toHaveBeenCalledWith(period2, [], undefined);

    expect(manifest.periods).toEqual([
      { id: "foo0", start: 4, adaptations: adapP1 },
      { id: "foo1", start: 12, adaptations: adapP2 },
    ]);
    expect(manifest.adaptations).toBe(adapP1);

    expect(fakeIdGenerator).toHaveBeenCalled();
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should push parsing errors if there are unsupported Adaptations", async () => {
    const period1 = generateParsedPeriod("0", 4, undefined);
    const period2 = generateParsedPeriod("1", 12, undefined);
    const simpleFakeManifest = {
      id: "man",
      isDynamic: false,
      isLive: false,
      duration: 5,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      periods: [period1, period2],
    };

    const fakePeriod = vi.fn((period, unsupportedAdaptations) => {
      unsupportedAdaptations.push({
        type: "audio",
        language: "",
        normalized: "",
        audioDescription: false,
        id: period.adaptations.audio[0].id,
        representations: period.adaptations.audio[0].representations,
      });
      return { ...period, id: `foo${period.id}` };
    });
    vi.doMock("../period", () => ({
      default: fakePeriod,
    }));
    const Manifest = ((await vi.importActual("../manifest")) as any).default;

    const warnings: IPlayerError[] = [];
    new Manifest(simpleFakeManifest, {}, warnings);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toEqual("MEDIA_ERROR");
    expect(warnings[0].code).toEqual("MANIFEST_INCOMPATIBLE_CODECS_ERROR");
    expect(
      (warnings[0] as unknown as { tracksMetadata: unknown }).tracksMetadata,
    ).toEqual([
      {
        track: {
          language: "",
          normalized: "",
          audioDescription: false,
          id: period1.adaptations.audio[0].id,
          representations: period1.adaptations.audio[0].representations,
        },
        type: "audio",
      },
      {
        track: {
          language: "",
          normalized: "",
          audioDescription: false,
          id: period2.adaptations.audio[0].id,
          representations: period2.adaptations.audio[0].representations,
        },
        type: "audio",
      },
    ]);

    expect(fakeIdGenerator).toHaveBeenCalled();
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should correctly parse every manifest information given", async () => {
    const oldPeriod1 = generateParsedPeriod("0", 4, undefined);
    const oldPeriod2 = generateParsedPeriod("1", 12, undefined);
    const time = getMonotonicTimeStamp();
    const oldManifestArgs = {
      availabilityStartTime: 5,
      duration: 12,
      id: "man",
      isDynamic: false,
      isLive: false,
      lifetime: 13,
      periods: [oldPeriod1, oldPeriod2],
      timeBounds: {
        minimumSafePosition: 5,
        timeshiftDepth: null,
        maximumTimeData: { isLinear: false, maximumSafePosition: 10, time },
      },
      suggestedPresentationDelay: 99,
      uris: ["url1", "url2"],
    };

    const fakePeriod = vi.fn((period, unsupportedAdaptations) => {
      unsupportedAdaptations.push({
        id: period.adaptations.audio[0].id,
        type: "audio",
        representations: [],
      });
      return { ...period, id: `foo${period.id}` };
    });
    vi.doMock("../period", () => ({
      default: fakePeriod,
    }));
    const Manifest = ((await vi.importActual("../manifest")) as any).default;
    const warnings: IPlayerError[] = [];
    const manifest = new Manifest(oldManifestArgs, {}, warnings);

    expect(manifest.adaptations).toEqual(oldPeriod1.adaptations);
    expect(manifest.availabilityStartTime).toEqual(5);
    expect(manifest.id).toEqual("fakeId");
    expect(manifest.isDynamic).toEqual(false);
    expect(manifest.isLive).toEqual(false);
    expect(manifest.lifetime).toEqual(13);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toEqual("MEDIA_ERROR");
    expect(warnings[0].code).toEqual("MANIFEST_INCOMPATIBLE_CODECS_ERROR");

    expect(manifest.getMaximumSafePosition()).toEqual(10);
    expect(manifest.getMinimumSafePosition()).toEqual(5);
    expect(manifest.periods).toEqual([
      { id: "foo0", adaptations: oldPeriod1.adaptations, start: 4 },
      { id: "foo1", adaptations: oldPeriod2.adaptations, start: 12 },
    ]);
    expect(manifest.suggestedPresentationDelay).toEqual(99);
    expect(manifest.uris).toEqual(["url1", "url2"]);
    expect(fakeIdGenerator).toHaveBeenCalled();
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
  });

  it("should return all URLs given with `getContentUrls`", async () => {
    const fakePeriod = vi.fn((period, unsupportedAdaptations) => {
      unsupportedAdaptations.push({
        id: period.adaptations.audio[0].id,
        type: "audio",
        representations: [],
      });
      return { ...period, id: `foo${period.id}` };
    });
    vi.doMock("../period", () => ({
      default: fakePeriod,
    }));
    const Manifest = ((await vi.importActual("../manifest")) as any).default;

    const oldPeriod1 = generateParsedPeriod("0", 4, undefined);
    const oldPeriod2 = generateParsedPeriod("1", 12, undefined);
    const oldManifestArgs1 = {
      availabilityStartTime: 5,
      duration: 12,
      id: "man",
      isDynamic: false,
      isLive: false,
      lifetime: 13,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      periods: [oldPeriod1, oldPeriod2],
      suggestedPresentationDelay: 99,
      uris: ["url1", "url2"],
    };

    const manifest1 = new Manifest(oldManifestArgs1, {}, []);
    expect(manifest1.getUrls()).toEqual(["url1", "url2"]);

    const oldManifestArgs2 = {
      availabilityStartTime: 5,
      duration: 12,
      id: "man",
      isDynamic: false,
      isLive: false,
      lifetime: 13,
      periods: [
        { id: "0", start: 4, adaptations: oldPeriod1.adaptations },
        { id: "1", start: 12, adaptations: oldPeriod2.adaptations },
      ],
      suggestedPresentationDelay: 99,
      timeBounds: {
        minimumSafePosition: 0,
        timeshiftDepth: null,
        maximumTimeData: {
          isLinear: false,
          maximumSafePosition: 10,
          time: 10,
        },
      },
      uris: [],
    };
    const manifest2 = new Manifest(oldManifestArgs2, {}, []);
    expect(manifest2.getUrls()).toEqual([]);
  });

  it("should replace with a new Manifest when calling `replace`", async () => {
    const fakePeriod = vi.fn((period, unsupportedAdaptations) => {
      unsupportedAdaptations.push({
        id: period.adaptations.audio[0].id,
        type: "audio",
        representations: [],
      });
      return { ...period, id: `foo${period.id}` };
    });
    const fakeReplacePeriodsRes = {
      updatedPeriods: [],
      addedPeriods: [],
      removedPeriods: [],
    };
    const fakeReplacePeriods = vi.fn(() => fakeReplacePeriodsRes);
    vi.doMock("../period", () => ({
      default: fakePeriod,
    }));
    vi.doMock("../update_periods", () => ({
      replacePeriods: fakeReplacePeriods,
    }));

    const oldPeriod1 = generateParsedPeriod("0", 4, undefined);
    const oldPeriod2 = generateParsedPeriod("1", 12, undefined);
    const oldManifestArgs = {
      availabilityStartTime: 5,
      duration: 12,
      id: "man",
      isDynamic: false,
      isLive: false,
      lifetime: 13,
      periods: [oldPeriod1, oldPeriod2],
      timeBounds: {
        minimumSafePosition: 7,
        timeshiftDepth: 10,
        maximumTimeData: {
          isLinear: true,
          maximumSafePosition: 30,
          time: 30000,
        },
      },
      suggestedPresentationDelay: 99,
      uris: ["url1", "url2"],
    };

    const Manifest = ((await vi.importActual("../manifest")) as any).default;
    const manifest = new Manifest(oldManifestArgs, {}, []);

    const mockTrigger = vi.spyOn(manifest, "trigger").mockImplementation(vi.fn());

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
      uris: ["url3", "url4"],
    };

    manifest.replace(newManifest);
    expect(fakeReplacePeriods).toHaveBeenCalledTimes(1);
    expect(fakeReplacePeriods).toHaveBeenCalledWith(
      manifest.periods,
      newManifest.periods,
    );
    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith("manifestUpdate", fakeReplacePeriodsRes);
    expect(fakeIdGenerator).toHaveBeenCalled();
    expect(fakeGenerateNewId).toHaveBeenCalledTimes(1);
    expect(fakeLogger.info).not.toHaveBeenCalled();
    expect(fakeLogger.warn).not.toHaveBeenCalled();
    mockTrigger.mockRestore();
  });
});
