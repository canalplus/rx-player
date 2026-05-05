import { describe, beforeEach, it, expect, vi } from "vitest";
import type {
  IParsedAdaptation,
  IParsedPeriod,
} from "../../../parsers/manifest/index.ts";
import type Adaptation from "../adaptation.ts";
import CodecSupportCache from "../codec_support_cache.ts";
import Period from "../period.ts";

const mocks = vi.hoisted(() => {
  const fakeAdaptation = vi.fn();
  const SUPPORTED_ADAPTATIONS_TYPE: string[] = [];
  return {
    fakeAdaptation,
    SUPPORTED_ADAPTATIONS_TYPE,
  };
});

vi.mock("../adaptation", () => ({
  default: mocks.fakeAdaptation,
}));

describe("Manifest - Period", () => {
  beforeEach(() => {
    mocks.fakeAdaptation.mockClear();
    mocks.SUPPORTED_ADAPTATIONS_TYPE.length = 0;
    vi.resetModules();
  });

  it("should throw if no adaptation is given", async () => {
    mocks.fakeAdaptation.mockImplementation(function (arg: IParsedAdaptation) {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      };
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text"]);

    const args = { id: "12", adaptations: {}, start: 0, thumbnailTracks: [] };
    let period: Period | null = null;
    let errorReceived: unknown = null;
    try {
      const codecSupportCache = new CodecSupportCache([]);
      period = new Period(args, codecSupportCache);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code?: string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect(errorReceived.message).toContain(
      "The manifest has no video nor audio tracks.",
    );
    expect(mocks.fakeAdaptation).not.toHaveBeenCalled();
  });

  it("should throw if no audio nor video adaptation is given", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text", "foo"]);

    const fooAda1 = {
      type: "foo",
      id: "54",
      representations: [{}],
    };
    const fooAda2 = {
      type: "foo",
      id: "55",
      representations: [{}],
    };
    const foo = [fooAda1, fooAda2];
    const args: IParsedPeriod = {
      id: "12",
      adaptations: { foo },
      start: 0,
      thumbnailTracks: [],
    } as unknown as IParsedPeriod;
    let period: Period | null = null;
    let errorReceived: unknown = null;
    const codecSupportCache = new CodecSupportCache([]);
    try {
      period = new Period(args, codecSupportCache);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code?: string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect((errorReceived as { type?: string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain(
      "The manifest has no video nor audio tracks.",
    );

    expect(mocks.fakeAdaptation).toHaveBeenCalledTimes(2);
    expect(mocks.fakeAdaptation).toHaveBeenNthCalledWith(
      1,
      fooAda1,
      codecSupportCache,
      {},
    );
    expect(mocks.fakeAdaptation).toHaveBeenNthCalledWith(
      2,
      fooAda2,
      codecSupportCache,
      {},
    );
  });

  it("should throw if only empty audio and video adaptations is given", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text", "foo"]);

    const args = {
      id: "12",
      thumbnailTracks: [],
      adaptations: { video: [], audio: [] },
      start: 0,
    };
    let period: Period | null = null;
    let errorReceived: unknown = null;
    try {
      const codecSupportCache = new CodecSupportCache([]);
      period = new Period(args, codecSupportCache);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code?: string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect((errorReceived as { type?: string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain(
      "The manifest has no video nor audio tracks.",
    );

    expect(mocks.fakeAdaptation).toHaveBeenCalledTimes(0);
  });

  it("should throw if there is no video nor audio representations in any adaptations.", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text", "foo"]);

    const videoAda1 = {
      type: "video",
      id: "54",
      representations: [],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const videoAda2 = {
      type: "video",
      id: "56",
      representations: [],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const videoAda3 = {
      type: "video",
      id: "57",
      representations: [],
      toVideoTrack() {
        return videoAda3;
      },
    };
    const video = [videoAda1, videoAda2, videoAda3];

    const audioAda1 = {
      type: "audio",
      id: "58",
      representations: [],
      toAudioTrack() {
        return audioAda1;
      },
    };
    const audioAda2 = {
      type: "audio",
      id: "59",
      representations: [],
      toAudioTrack() {
        return audioAda2;
      },
    };
    const audio = [audioAda1, audioAda2];
    const args: IParsedPeriod = {
      id: "12",
      adaptations: { video, audio },
      thumbnailTracks: [],
      start: 0,
    } as unknown as IParsedPeriod;
    let period: Period | null = null;
    let errorReceived: unknown = null;
    try {
      const codecSupportCache = new CodecSupportCache([]);
      period = new Period(args, codecSupportCache);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code?: string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect((errorReceived as { type?: string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain(
      "The manifest has no video nor audio tracks.",
    );
  });

  it("should not throw if there is no video representation but it has an audio representation.", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text"]);

    const videoAdaptation = {
      type: "video",
      id: "54",
      representations: [], // empty representations array
      toVideoTrack() {
        return videoAdaptation;
      },
    };

    const audioAdaptation = {
      type: "audio",
      id: "58",
      representations: [{}], // non empty representations array
      toAudioTrack() {
        return audioAdaptation;
      },
    };

    const args: IParsedPeriod = {
      id: "12",
      adaptations: { video: [videoAdaptation], audio: [audioAdaptation] },
      start: 0,
      thumbnailTracks: [],
    } as unknown as IParsedPeriod;
    let period: Period | null = null;
    let errorReceived: unknown = null;
    try {
      const codecSupportCache = new CodecSupportCache([]);
      period = new Period(args, codecSupportCache);
    } catch (e) {
      errorReceived = e;
    }

    expect(period).not.toBe(null);
    expect(errorReceived).toBe(null);
  });

  it("should report that all video adaptations are not supported", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: arg.type !== "video",
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text", "foo"]);

    const videoAda1 = {
      type: "video",
      id: "54",
      representations: [{}],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const videoAda2 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const videoAda3 = {
      type: "video",
      id: "56",
      representations: [{}],
      toVideoTrack() {
        return videoAda3;
      },
    };
    const video: IParsedAdaptation[] = [
      videoAda1,
      videoAda2,
      videoAda3,
    ] as unknown as IParsedAdaptation[];

    const audioAda1 = {
      type: "audio",
      id: "58",
      representations: [{}],
      toAudioTrack() {
        return audioAda1;
      },
    };
    const audioAda2 = {
      type: "audio",
      id: "59",
      representations: [{}],
      toAudioTrack() {
        return audioAda2;
      },
    };
    const audio = [audioAda1, audioAda2] as unknown as IParsedAdaptation[];
    const args = {
      id: "12",
      adaptations: { video, audio },
      start: 0,
      thumbnailTracks: [],
    };
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, codecSupportCache);

    expect(period.adaptations.video).not.toBe(undefined);
    expect(period.adaptations.video?.length).toBe(3);
    expect(
      period.adaptations.video?.every(
        (adaptation) => adaptation.supportStatus.hasSupportedCodec === false,
      ),
    ).toBe(true);
  });

  it("should not set a parsing error if an empty unsupported adaptation is given", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text", "foo"]);

    const videoAda1 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const video = [videoAda1] as unknown as IParsedAdaptation[];
    const bar = undefined;
    const args = {
      id: "12",
      thumbnailTracks: [],
      adaptations: { bar, video },
      start: 0,
    };
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, codecSupportCache);
    expect(period.adaptations).toEqual({
      video: video.map((v) => ({
        ...v,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      })),
    });

    expect(mocks.fakeAdaptation).toHaveBeenCalledTimes(1);
    expect(mocks.fakeAdaptation).toHaveBeenCalledWith(videoAda1, codecSupportCache, {});
    expect(period.adaptations.audio).toBe(undefined);
  });

  it("should give a representationFilter to the adaptation", () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    const representationFilter = vi.fn();
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text"]);

    const videoAda1 = {
      type: "video",
      id: "54",
      representations: [{}],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const videoAda2 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const video = [videoAda1, videoAda2] as unknown as IParsedAdaptation[];
    const args = { id: "12", adaptations: { video }, start: 0, thumbnailTracks: [] };
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, codecSupportCache, representationFilter);

    expect(period.adaptations.video).toHaveLength(2);

    expect(mocks.fakeAdaptation).toHaveBeenCalledTimes(2);
    expect(mocks.fakeAdaptation).toHaveBeenNthCalledWith(
      1,
      videoAda1,
      codecSupportCache,
      {
        representationFilter,
      },
    );
    expect(mocks.fakeAdaptation).toHaveBeenNthCalledWith(
      2,
      videoAda2,
      codecSupportCache,
      {
        representationFilter,
      },
    );
    expect(representationFilter).not.toHaveBeenCalled();
  });

  it("should not report if an Adaptation has no Representation", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text"]);

    const videoAda1 = {
      type: "video",
      id: "54",
      representations: [],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const videoAda2 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const fooAda1 = {
      type: "audio" as const,
      id: "12",
      representations: [],
    };
    const video = [videoAda1, videoAda2] as unknown as IParsedAdaptation[];
    const audio = [fooAda1];
    const args = {
      id: "12",
      thumbnailTracks: [],
      adaptations: { video, audio },
      start: 0,
    };
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, codecSupportCache);
    // TO DO: is the test relevant?
    expect(period.adaptations.audio?.length).toBe(0);
  });

  it("should set the given start", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text"]);

    const videoAda1 = {
      type: "video",
      id: "54",
      representations: [{}],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const videoAda2 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const video = [videoAda1, videoAda2] as unknown as IParsedAdaptation[];
    const args = { id: "12", adaptations: { video }, start: 72, thumbnailTracks: [] };
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, codecSupportCache);
    expect(period.start).toEqual(72);
    expect(period.duration).toEqual(undefined);
    expect(period.end).toEqual(undefined);
  });

  it("should set a given duration", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text"]);

    const videoAda1 = {
      type: "video",
      id: "54",
      representations: [{}],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const videoAda2 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const video = [videoAda1, videoAda2] as unknown as IParsedAdaptation[];
    const args = {
      id: "12",
      adaptations: { video },
      start: 0,
      duration: 12,
      thumbnailTracks: [],
    };
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, codecSupportCache);
    expect(period.start).toEqual(0);
    expect(period.duration).toEqual(12);
    expect(period.end).toEqual(12);
  });

  it("should infer the end from the start and the duration", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text"]);

    const videoAda1 = {
      type: "video",
      id: "54",
      representations: [{}],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const videoAda2 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const video = [videoAda1, videoAda2] as unknown as IParsedAdaptation[];
    const args = {
      id: "12",
      adaptations: { video },
      start: 50,
      duration: 12,
      thumbnailTracks: [],
    };
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, codecSupportCache);
    expect(period.start).toEqual(50);
    expect(period.duration).toEqual(12);
    expect(period.end).toEqual(62);
  });

  it("should return every Adaptations combined with `getAdaptations`", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text"]);

    const videoAda1 = {
      type: "video",
      id: "54",
      representations: [{}],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const videoAda2 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const video = [videoAda1, videoAda2] as unknown as IParsedAdaptation[];

    const audioAda1 = {
      type: "audio",
      id: "56",
      representations: [{}],
      toAudioTrack() {
        return audioAda1;
      },
    };
    const audio = [audioAda1] as unknown as IParsedAdaptation[];

    const args = {
      id: "12",
      thumbnailTracks: [],
      adaptations: { video, audio },
      start: 50,
      duration: 12,
    };
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, codecSupportCache);
    expect(period.getAdaptations()).toHaveLength(3);
    expect(period.getAdaptations()).toContain(period.adaptations.video?.[0]);
    expect(period.getAdaptations()).toContain(period.adaptations.video?.[1]);
    expect(period.getAdaptations()).toContain(period.adaptations.audio?.[0]);
  });

  it("should return every Adaptations from a given type with `getAdaptationsForType`", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text"]);

    const videoAda1 = {
      type: "video",
      id: "54",
      representations: [{}],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const videoAda2 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const video = [videoAda1, videoAda2] as unknown as IParsedAdaptation[];

    const audioAda1 = {
      type: "audio",
      id: "56",
      representations: [{}],
      toAudioTrack() {
        return audioAda1;
      },
    };
    const audio = [audioAda1] as unknown as IParsedAdaptation[];

    const args = {
      id: "12",
      thumbnailTracks: [],
      adaptations: { video, audio },
      start: 50,
      duration: 12,
    };
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, codecSupportCache);

    expect(period.getAdaptationsForType("video")).toHaveLength(2);
    expect(period.getAdaptationsForType("video")).toEqual([
      period.adaptations.video?.[0],
      period.adaptations.video?.[1],
    ]);

    expect(period.getAdaptationsForType("audio")).toHaveLength(1);
    expect(period.getAdaptationsForType("audio")).toEqual([
      period.adaptations.audio?.[0],
    ]);

    expect(period.getAdaptationsForType("text")).toHaveLength(0);
  });

  it("should return the first Adaptations with a given Id when calling `getAdaptation`", async () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text"]);

    const videoAda1 = {
      type: "video",
      id: "54",
      representations: [{}],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const videoAda2 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const videoAda3 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda3;
      },
    };
    const video = [videoAda1, videoAda2, videoAda3] as unknown as IParsedAdaptation[];

    const audioAda1 = {
      type: "audio",
      id: "56",
      representations: [{}],
      toAudioTrack() {
        return audioAda1;
      },
    };
    const audio = [audioAda1] as unknown as IParsedAdaptation[];

    const args = {
      id: "12",
      thumbnailTracks: [],
      adaptations: { video, audio },
      start: 50,
      duration: 12,
    };
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, codecSupportCache);
    expect(period.getAdaptation("54")).toEqual(period.adaptations.video?.[0]);
    expect(period.getAdaptation("55")).toEqual(period.adaptations.video?.[1]);
    expect(period.getAdaptation("56")).toEqual(period.adaptations.audio?.[0]);
  });

  it("should return undefind if no adaptation has the given Id when calling `getAdaptation`", () => {
    mocks.fakeAdaptation.mockImplementation(function (
      arg: IParsedAdaptation,
    ): Adaptation {
      return {
        ...arg,
        supportStatus: {
          hasSupportedCodec: undefined,
          hasCodecWithUndefinedSupport: true,
          isDecipherable: undefined,
        },
      } as unknown as Adaptation;
    });
    mocks.SUPPORTED_ADAPTATIONS_TYPE.push(...["audio", "video", "text"]);

    const videoAda1 = {
      type: "video",
      id: "54",
      representations: [{}],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const videoAda2 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const videoAda3 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda3;
      },
    };
    const video = [videoAda1, videoAda2, videoAda3] as unknown as IParsedAdaptation[];

    const audioAda1 = {
      type: "audio",
      id: "56",
      representations: [{}],
      toAudioTrack() {
        return audioAda1;
      },
    };
    const audio = [audioAda1] as unknown as IParsedAdaptation[];

    const args = {
      id: "12",
      adaptations: { video, audio },
      thumbnailTracks: [],
      start: 50,
      duration: 12,
    };
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, codecSupportCache);
    expect(unsupportedAdaptations).toHaveLength(0);
    expect(period.getAdaptation("Oh, comely")).toEqual(undefined);
  });
});
