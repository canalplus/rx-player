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

import type { IPlayerError } from "../../../public_types";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
    warn: jest.fn(() => undefined),
    info: jest.fn(() => undefined),
  };
  const fakeGenerateNewId = jest.fn(() => "fakeId");
  const fakeIdGenerator = jest.fn(() => fakeGenerateNewId);

  beforeEach(() => {
    jest.resetModules();
    fakeLogger.warn.mockClear();
    fakeLogger.info.mockClear();
    jest.mock("../../../log", () => ({
      __esModule: true as const,
      default: fakeLogger,
    }));
    fakeGenerateNewId.mockClear();
    fakeIdGenerator.mockClear();
    jest.mock("../../../utils/id_generator", () => ({
      __esModule: true as const,
      default: fakeIdGenerator,
    }));
  });

  it("should create a normalized Manifest structure", () => {
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

    const Manifest = jest.requireActual("../manifest").default;
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

  it("should create a Period for each manifest.periods given", () => {
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

    const fakePeriod = jest.fn((period) => {
      return { id: `foo${period.id}`, adaptations: period.adaptations };
    });
    jest.mock("../period", () => ({
      __esModule: true as const,
      default: fakePeriod,
    }));

    const Manifest = jest.requireActual("../manifest").default;
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

  it("should pass a `representationFilter` to the Period if given", () => {
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

    const fakePeriod = jest.fn((period) => {
      return { id: `foo${period.id}` };
    });
    jest.mock("../period", () => ({
      __esModule: true as const,
      default: fakePeriod,
    }));
    const Manifest = jest.requireActual("../manifest").default;

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

  it("should expose the adaptations of the first period if set", () => {
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

    const fakePeriod = jest.fn((period) => {
      return { ...period, id: `foo${period.id}` };
    });
    jest.mock("../period", () => ({
      __esModule: true as const,
      default: fakePeriod,
    }));
    const Manifest = jest.requireActual("../manifest").default;

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

  it("should push parsing errors if there are unsupported Adaptations", () => {
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

    const fakePeriod = jest.fn((period, unsupportedAdaptations) => {
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
    jest.mock("../period", () => ({
      __esModule: true as const,
      default: fakePeriod,
    }));
    const Manifest = jest.requireActual("../manifest").default;

    const warnings: IPlayerError[] = [];
    new Manifest(simpleFakeManifest, {}, warnings);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toEqual("MEDIA_ERROR");
    expect(warnings[0].code).toEqual("MANIFEST_INCOMPATIBLE_CODECS_ERROR");
    expect((warnings[0] as unknown as { tracksInfo: unknown }).tracksInfo).toEqual([
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

  it("should correctly parse every manifest information given", () => {
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

    const fakePeriod = jest.fn((period, unsupportedAdaptations) => {
      unsupportedAdaptations.push({
        id: period.adaptations.audio[0].id,
        type: "audio",
        representations: [],
      });
      return { ...period, id: `foo${period.id}` };
    });
    jest.mock("../period", () => ({
      __esModule: true as const,
      default: fakePeriod,
    }));
    const Manifest = jest.requireActual("../manifest").default;
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

  it("should return all URLs given with `getContentUrls`", () => {
    const fakePeriod = jest.fn((period, unsupportedAdaptations) => {
      unsupportedAdaptations.push({
        id: period.adaptations.audio[0].id,
        type: "audio",
        representations: [],
      });
      return { ...period, id: `foo${period.id}` };
    });
    jest.mock("../period", () => ({
      __esModule: true as const,
      default: fakePeriod,
    }));
    const Manifest = jest.requireActual("../manifest").default;

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

  it("should replace with a new Manifest when calling `replace`", () => {
    const fakePeriod = jest.fn((period, unsupportedAdaptations) => {
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
    const fakeReplacePeriods = jest.fn(() => fakeReplacePeriodsRes);
    jest.mock("../period", () => ({
      __esModule: true as const,
      default: fakePeriod,
    }));
    jest.mock("../update_periods", () => ({
      __esModule: true as const,
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

    const Manifest = jest.requireActual("../manifest").default;
    const manifest = new Manifest(oldManifestArgs, {}, []);

    const mockTrigger = jest.spyOn(manifest, "trigger").mockImplementation(jest.fn());

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
