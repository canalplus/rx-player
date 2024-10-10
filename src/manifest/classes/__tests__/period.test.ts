import { describe, beforeEach, it, expect, vi } from "vitest";
import type { IParsedAdaptation, IParsedPeriod } from "../../../parsers/manifest";
import type Adaptation from "../adaptation";
import CodecSupportCache from "../codec_support_cache";
import type IPeriod from "../period";

describe("Manifest - Period", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should throw if no adaptation is given", async () => {
    const mockAdaptation = vi.fn((arg: IParsedAdaptation) => ({
      ...arg,
      supportStatus: {
        hasSupportedCodec: undefined,
        hasCodecWithUndefinedSupport: true,
        isDecipherable: undefined,
      },
    }));
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
    const args = { id: "12", adaptations: {}, start: 0 };
    let period: IPeriod | null = null;
    let errorReceived: unknown = null;
    const unsupportedAdaptations: Adaptation[] = [];
    try {
      const codecSupportCache = new CodecSupportCache([]);
      period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    } catch (e) {
      errorReceived = e;
    }

    expect(unsupportedAdaptations).toHaveLength(0);
    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code?: string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect(errorReceived.message).toContain("No supported audio and video tracks.");
    expect(mockAdaptation).not.toHaveBeenCalled();
  });

  it("should throw if no audio nor video adaptation is given", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
    } as unknown as IParsedPeriod;
    let period: IPeriod | null = null;
    let errorReceived: unknown = null;
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    try {
      period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    } catch (e) {
      errorReceived = e;
    }

    expect(unsupportedAdaptations).toHaveLength(0);
    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code?: string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect((errorReceived as { type?: string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported audio and video tracks.");

    expect(mockAdaptation).toHaveBeenCalledTimes(2);
    expect(mockAdaptation).toHaveBeenNthCalledWith(1, fooAda1, { codecSupportCache });
    expect(mockAdaptation).toHaveBeenNthCalledWith(2, fooAda2, { codecSupportCache });
  });

  it("should throw if only empty audio and/or video adaptations is given", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
    const args = { id: "12", adaptations: { video: [], audio: [] }, start: 0 };
    let period: IPeriod | null = null;
    let errorReceived: unknown = null;
    const unsupportedAdaptations: Adaptation[] = [];
    try {
      const codecSupportCache = new CodecSupportCache([]);
      period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    } catch (e) {
      errorReceived = e;
    }

    expect(unsupportedAdaptations).toHaveLength(0);
    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code?: string }).code).toBe("MANIFEST_PARSE_ERROR");
    expect((errorReceived as { type?: string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported audio and video tracks.");

    expect(mockAdaptation).toHaveBeenCalledTimes(0);
  });

  it("should throw if we are left with no audio representation", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
      id: "56",
      representations: [{}],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const videoAda3 = {
      type: "video",
      id: "57",
      representations: [{}],
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
      start: 0,
    } as unknown as IParsedPeriod;
    let period: IPeriod | null = null;
    let errorReceived: unknown = null;
    const unsupportedAdaptations: Adaptation[] = [];
    try {
      const codecSupportCache = new CodecSupportCache([]);
      period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    } catch (e) {
      errorReceived = e;
    }

    expect(unsupportedAdaptations).toHaveLength(0);
    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code?: string }).code).toBe(
      "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
    );
    expect((errorReceived as { type?: string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported audio adaptations");
  });

  it("should throw if no audio Adaptation is supported", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: arg.type !== "audio",
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
      id: "57",
      representations: [{}],
      toAudioTrack() {
        return audioAda1;
      },
    };
    const audioAda2 = {
      type: "audio",
      id: "58",
      representations: [{}],
      toAudioTrack() {
        return audioAda1;
      },
    };
    const audio: IParsedAdaptation[] = [
      audioAda1,
      audioAda2,
    ] as unknown as IParsedAdaptation[];
    const args: IParsedPeriod = {
      id: "12",
      adaptations: { video, audio },
      start: 0,
    };
    let period: IPeriod | null = null;
    let errorReceived: unknown = null;
    const unsupportedAdaptations: Adaptation[] = [];
    try {
      const codecSupportCache = new CodecSupportCache([]);
      period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);
    expect(unsupportedAdaptations).toHaveLength(2);
    expect(unsupportedAdaptations[0].id).toEqual("57");
    expect(unsupportedAdaptations[1].id).toEqual("58");

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code?: string }).code).toBe(
      "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
    );
    expect((errorReceived as { type?: string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported audio adaptations");
  });

  it("should throw if we are left with no video representation", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
      representations: [],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const videoAda3 = {
      type: "video",
      id: "56",
      representations: [],
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
    const audio: IParsedAdaptation[] = [
      audioAda1,
      audioAda2,
    ] as unknown as IParsedAdaptation[];
    const args: IParsedPeriod = { id: "12", adaptations: { video, audio }, start: 0 };
    let period: IPeriod | null = null;
    let errorReceived: unknown = null;
    const unsupportedAdaptations: Adaptation[] = [];
    try {
      const codecSupportCache = new CodecSupportCache([]);
      period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    } catch (e) {
      errorReceived = e;
    }

    expect(unsupportedAdaptations).toHaveLength(0);
    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code?: string }).code).toBe(
      "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
    );
    expect((errorReceived as { type?: string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported video adaptation");
  });

  it("should throw if no video adaptation is supported", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: arg.type !== "video",
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
    const args = { id: "12", adaptations: { video, audio }, start: 0 };
    let period: IPeriod | null = null;
    let errorReceived: unknown = null;
    const unsupportedAdaptations: Adaptation[] = [];
    try {
      const codecSupportCache = new CodecSupportCache([]);
      period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    } catch (e) {
      errorReceived = e;
    }

    expect(period).toBe(null);
    expect(errorReceived).not.toBe(null);
    expect(errorReceived).toBeInstanceOf(Error);
    expect(unsupportedAdaptations).toHaveLength(3);

    // Impossible check to shut-up TypeScript
    if (!(errorReceived instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }

    expect((errorReceived as { code?: string }).code).toBe(
      "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
    );
    expect((errorReceived as { type?: string }).type).toBe("MEDIA_ERROR");
    expect(errorReceived.message).toContain("No supported video adaptation");
  });

  it("should set a parsing error if an unsupported adaptation is given", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: arg.id !== "56",
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;

    const videoAda1 = {
      type: "video",
      id: "55",
      representations: [{}],
      toVideoTrack() {
        return videoAda1;
      },
    };
    const video = [videoAda1] as unknown as IParsedAdaptation[];
    const videoAda2 = {
      type: "video",
      id: "56",
      representations: [{}],
      toVideoTrack() {
        return videoAda2;
      },
    };
    const video2 = [videoAda2] as unknown as IParsedAdaptation[];
    const args = { id: "12", adaptations: { video, video2 }, start: 0 };
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    expect(unsupportedAdaptations).toHaveLength(1);

    expect(mockAdaptation).toHaveBeenCalledTimes(2);
    expect(mockAdaptation).toHaveReturnedTimes(2);
    expect(mockAdaptation).toHaveBeenCalledWith(videoAda1, { codecSupportCache });
    expect(mockAdaptation).toHaveBeenCalledWith(videoAda2, { codecSupportCache });
    expect(mockAdaptation).toHaveReturnedWith(period.adaptations.video?.[0]);

    const [adap] = unsupportedAdaptations;
    expect(adap.id).toBe("56");
    expect(adap.supportStatus.hasSupportedCodec).toBe(false);
  });

  it("should not set a parsing error if an empty unsupported adaptation is given", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text", "foo"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;

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
    const args = { id: "12", adaptations: { bar, video }, start: 0 };
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, { unsupportedAdaptations, codecSupportCache });
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
    expect(unsupportedAdaptations).toHaveLength(0);

    expect(mockAdaptation).toHaveBeenCalledTimes(1);
    expect(mockAdaptation).toHaveBeenCalledWith(videoAda1, { codecSupportCache });
  });

  it("should give a representationFilter to the adaptation", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    const representationFilter = vi.fn();
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
    const args = { id: "12", adaptations: { video }, start: 0 };
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, {
      unsupportedAdaptations,
      codecSupportCache,
      representationFilter,
    });

    expect(unsupportedAdaptations).toHaveLength(0);
    expect(period.adaptations.video).toHaveLength(2);

    expect(mockAdaptation).toHaveBeenCalledTimes(2);
    expect(mockAdaptation).toHaveBeenNthCalledWith(1, videoAda1, {
      codecSupportCache,
      representationFilter,
    });
    expect(mockAdaptation).toHaveBeenNthCalledWith(2, videoAda2, {
      codecSupportCache,
      representationFilter,
    });
    expect(representationFilter).not.toHaveBeenCalled();
  });

  it("should report if Adaptations are not supported", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: arg.id === "55",
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
    const fooAda1 = {
      type: "foo",
      id: "12",
      representations: [{}],
    };
    const video = [videoAda1, videoAda2] as unknown as IParsedAdaptation[];
    const foo = [fooAda1];
    const args = { id: "12", adaptations: { video, foo }, start: 0 };
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    new Period(args, { unsupportedAdaptations, codecSupportCache });

    expect(unsupportedAdaptations).toHaveLength(2);
    const [adap1, adap2] = unsupportedAdaptations;
    expect((adap1 as { id: string }).id).toBe("54");
    expect((adap2 as { id: string }).id).toBe("12");
  });

  it("should not report if an Adaptation has no Representation", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
      type: "foo",
      id: "12",
      representations: [],
    };
    const video = [videoAda1, videoAda2] as unknown as IParsedAdaptation[];
    const foo = [fooAda1];
    const args = { id: "12", adaptations: { video, foo }, start: 0 };
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    new Period(args, { unsupportedAdaptations, codecSupportCache });
    expect(unsupportedAdaptations).toHaveLength(0);
  });

  it("should set the given start", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
    const args = { id: "12", adaptations: { video }, start: 72 };
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    expect(unsupportedAdaptations).toHaveLength(0);
    expect(period.start).toEqual(72);
    expect(period.duration).toEqual(undefined);
    expect(period.end).toEqual(undefined);
  });

  it("should set a given duration", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
    const args = { id: "12", adaptations: { video }, start: 0, duration: 12 };
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    expect(unsupportedAdaptations).toHaveLength(0);
    expect(period.start).toEqual(0);
    expect(period.duration).toEqual(12);
    expect(period.end).toEqual(12);
  });

  it("should infer the end from the start and the duration", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
    const args = { id: "12", adaptations: { video }, start: 50, duration: 12 };
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    expect(unsupportedAdaptations).toHaveLength(0);
    expect(period.start).toEqual(50);
    expect(period.duration).toEqual(12);
    expect(period.end).toEqual(62);
  });

  it("should return every Adaptations combined with `getAdaptations`", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
      adaptations: { video, audio },
      start: 50,
      duration: 12,
    };
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    expect(unsupportedAdaptations).toHaveLength(0);
    expect(period.getAdaptations()).toHaveLength(3);
    expect(period.getAdaptations()).toContain(period.adaptations.video?.[0]);
    expect(period.getAdaptations()).toContain(period.adaptations.video?.[1]);
    expect(period.getAdaptations()).toContain(period.adaptations.audio?.[0]);
  });

  it("should return every Adaptations from a given type with `getAdaptationsForType`", async () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
      adaptations: { video, audio },
      start: 50,
      duration: 12,
    };
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, { unsupportedAdaptations, codecSupportCache });
    expect(unsupportedAdaptations).toHaveLength(0);

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
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));

    const Period = (await vi.importActual("../period")).default as typeof IPeriod;
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
      start: 50,
      duration: 12,
    };
    const unsupportedAdaptations: Adaptation[] = [];
    const codecSupportCache = new CodecSupportCache([]);
    const period = new Period(args, { unsupportedAdaptations: [], codecSupportCache });
    expect(unsupportedAdaptations).toHaveLength(0);
    expect(period.getAdaptation("54")).toEqual(period.adaptations.video?.[0]);
    expect(period.getAdaptation("55")).toEqual(period.adaptations.video?.[1]);
    expect(period.getAdaptation("56")).toEqual(period.adaptations.audio?.[0]);
  });

  it("should return undefind if no adaptation has the given Id when calling `getAdaptation`", () => {
    const mockAdaptation = vi.fn(
      (arg: IParsedAdaptation): Adaptation =>
        ({
          ...arg,
          supportStatus: {
            hasSupportedCodec: undefined,
            hasCodecWithUndefinedSupport: true,
            isDecipherable: undefined,
          },
        }) as unknown as Adaptation,
    );
    vi.doMock("../adaptation", () => ({
      default: mockAdaptation,
      SUPPORTED_ADAPTATIONS_TYPE: ["audio", "video", "text"],
    }));
  });
});
