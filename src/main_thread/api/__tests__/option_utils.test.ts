import type { MockInstance } from "vitest";
import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import config from "../../../config";
import type {
  IAudioTrackSwitchingMode,
  IKeySystemOption,
  ILoadVideoOptions,
  IStartAtOption,
} from "../../../public_types";
import type {
  parseConstructorOptions as IParseConstructorOptions,
  parseLoadVideoOptions as IParseLoadVideoOptions,
  checkReloadOptions as ICheckReloadOptions,
} from "../option_utils";

let warnOnceMock: MockInstance;
let logWarnMock: MockInstance;

describe("API - parseConstructorOptions", () => {
  let parseConstructorOptions: typeof IParseConstructorOptions;
  beforeEach(async () => {
    warnOnceMock = vi.fn();
    logWarnMock = vi.fn();
    vi.doMock("../../../log", () => {
      return {
        default: {
          warn: logWarnMock,
        },
      };
    });
    vi.doMock("../../../utils/languages");
    vi.doMock("../../../utils/warn_once", () => {
      return { default: warnOnceMock };
    });
    parseConstructorOptions = (await vi.importActual("../option_utils"))
      .parseConstructorOptions as typeof IParseConstructorOptions;
  });

  afterEach(() => {
    vi.resetModules();
  });

  const videoElement = document.createElement("video");
  const {
    // DEFAULT_AUTO_PLAY,
    DEFAULT_BASE_BANDWIDTH,
    DEFAULT_VIDEO_RESOLUTION_LIMIT,
    // DEFAULT_MANUAL_BITRATE_SWITCHING_MODE,
    DEFAULT_MAX_BUFFER_AHEAD,
    DEFAULT_MAX_BUFFER_BEHIND,
    DEFAULT_MAX_VIDEO_BUFFER_SIZE,
    // DEFAULT_TEXT_TRACK_MODE,
    DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN,
    DEFAULT_WANTED_BUFFER_AHEAD,
  } = config.getCurrent();
  const defaultConstructorOptions = {
    maxVideoBufferSize: DEFAULT_MAX_VIDEO_BUFFER_SIZE,
    maxBufferAhead: DEFAULT_MAX_BUFFER_AHEAD,
    maxBufferBehind: DEFAULT_MAX_BUFFER_BEHIND,
    wantedBufferAhead: DEFAULT_WANTED_BUFFER_AHEAD,
    videoResolutionLimit: DEFAULT_VIDEO_RESOLUTION_LIMIT,
    throttleVideoBitrateWhenHidden: DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN,
    videoElement,
    baseBandwidth: DEFAULT_BASE_BANDWIDTH,
  };

  it("should create default values if no option is given", () => {
    expect(parseConstructorOptions({})).toEqual(defaultConstructorOptions);
  });

  it("should authorize setting a maxBufferAhead", () => {
    expect(parseConstructorOptions({ maxBufferAhead: 0 })).toEqual({
      ...defaultConstructorOptions,
      maxBufferAhead: 0,
    });
    expect(parseConstructorOptions({ maxBufferAhead: 10 })).toEqual({
      ...defaultConstructorOptions,
      maxBufferAhead: 10,
    });
    expect(parseConstructorOptions({ maxBufferAhead: Infinity })).toEqual({
      ...defaultConstructorOptions,
      maxBufferAhead: Infinity,
    });
  });

  it("should authorize setting a maxBufferBehind", () => {
    expect(parseConstructorOptions({ maxBufferBehind: 0 })).toEqual({
      ...defaultConstructorOptions,
      maxBufferBehind: 0,
    });
    expect(parseConstructorOptions({ maxBufferBehind: 10 })).toEqual({
      ...defaultConstructorOptions,
      maxBufferBehind: 10,
    });
    expect(parseConstructorOptions({ maxBufferBehind: Infinity })).toEqual({
      ...defaultConstructorOptions,
      maxBufferBehind: Infinity,
    });
  });

  it("should authorize setting a wantedBufferAhead", () => {
    expect(parseConstructorOptions({ wantedBufferAhead: 0 })).toEqual({
      ...defaultConstructorOptions,
      wantedBufferAhead: 0,
    });
    expect(parseConstructorOptions({ wantedBufferAhead: 10 })).toEqual({
      ...defaultConstructorOptions,
      wantedBufferAhead: 10,
    });
    expect(parseConstructorOptions({ wantedBufferAhead: Infinity })).toEqual({
      ...defaultConstructorOptions,
      wantedBufferAhead: Infinity,
    });
  });

  it("should authorize setting a videoResolutionLimit option", () => {
    expect(parseConstructorOptions({ videoResolutionLimit: "screen" })).toEqual({
      ...defaultConstructorOptions,
      videoResolutionLimit: "screen",
    });
    expect(parseConstructorOptions({ videoResolutionLimit: "videoElement" })).toEqual({
      ...defaultConstructorOptions,
      videoResolutionLimit: "videoElement",
    });
    expect(parseConstructorOptions({ videoResolutionLimit: "none" })).toEqual({
      ...defaultConstructorOptions,
      videoResolutionLimit: "none",
    });
  });

  it("should authorize setting a throttleVideoBitrateWhenHidden option", () => {
    expect(parseConstructorOptions({ throttleVideoBitrateWhenHidden: false })).toEqual({
      ...defaultConstructorOptions,
      throttleVideoBitrateWhenHidden: false,
    });
    expect(parseConstructorOptions({ throttleVideoBitrateWhenHidden: true })).toEqual({
      ...defaultConstructorOptions,
      throttleVideoBitrateWhenHidden: true,
    });
  });

  it("should authorize setting a videoElement option which can be any media element", () => {
    const _videoElement = document.createElement("video");
    const parsed1 = parseConstructorOptions({ videoElement: _videoElement });
    expect(parsed1).toEqual({
      ...defaultConstructorOptions,
      videoElement: _videoElement,
    });
    expect(parsed1.videoElement).toBe(_videoElement);

    const audioElement = document.createElement("audio");
    const parsed2 = parseConstructorOptions({ videoElement: audioElement });
    expect(parsed2).toEqual({
      ...defaultConstructorOptions,
      videoElement: audioElement,
    });
    expect(parsed2.videoElement).toBe(audioElement);
  });

  it("should authorize setting an baseBandwidth", () => {
    expect(parseConstructorOptions({ baseBandwidth: -1 })).toEqual({
      ...defaultConstructorOptions,
      baseBandwidth: -1,
    });
    expect(parseConstructorOptions({ baseBandwidth: 0 })).toEqual({
      ...defaultConstructorOptions,
      baseBandwidth: 0,
    });
    expect(parseConstructorOptions({ baseBandwidth: 10 })).toEqual({
      ...defaultConstructorOptions,
      baseBandwidth: 10,
    });
    expect(parseConstructorOptions({ baseBandwidth: Infinity })).toEqual({
      ...defaultConstructorOptions,
      baseBandwidth: Infinity,
    });
  });

  it("should throw if the maxBufferAhead given is not a number", () => {
    expect(() =>
      parseConstructorOptions({ maxBufferAhead: "a" as unknown as number }),
    ).toThrow();
    expect(() =>
      parseConstructorOptions({ maxBufferAhead: /a/ as unknown as number }),
    ).toThrow();
    expect(() =>
      parseConstructorOptions({ maxBufferAhead: {} as unknown as number }),
    ).toThrow();
  });

  it("should throw if the maxBufferBehind given is not a number", () => {
    expect(() =>
      parseConstructorOptions({ maxBufferBehind: "a" as unknown as number }),
    ).toThrow();
    expect(() =>
      parseConstructorOptions({ maxBufferBehind: /a/ as unknown as number }),
    ).toThrow();
    expect(() =>
      parseConstructorOptions({ maxBufferBehind: {} as unknown as number }),
    ).toThrow();
  });

  it("should throw if the wantedBufferAhead given is not a number", () => {
    expect(() =>
      parseConstructorOptions({ wantedBufferAhead: "a" as unknown as number }),
    ).toThrow();
    expect(() =>
      parseConstructorOptions({ wantedBufferAhead: /a/ as unknown as number }),
    ).toThrow();
    expect(() =>
      parseConstructorOptions({ wantedBufferAhead: {} as unknown as number }),
    ).toThrow();
  });

  it("should throw if the videoElement given is not an HTMLMediaElement", () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-restricted-types
      parseConstructorOptions({ videoElement: "a" as unknown as HTMLMediaElement }),
    ).toThrow();
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-restricted-types
      parseConstructorOptions({ videoElement: /a/ as unknown as HTMLMediaElement }),
    ).toThrow();
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-restricted-types
      parseConstructorOptions({ videoElement: {} as unknown as HTMLMediaElement }),
    ).toThrow();
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-restricted-types
      parseConstructorOptions({ videoElement: [] as unknown as HTMLMediaElement }),
    ).toThrow();
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-restricted-types
      parseConstructorOptions({ videoElement: 0 as unknown as HTMLMediaElement }),
    ).toThrow();
    expect(() =>
      parseConstructorOptions({
        // eslint-disable-next-line @typescript-eslint/no-restricted-types
        videoElement: document.createElement("div") as unknown as HTMLMediaElement,
      }),
    ).toThrow();
  });

  it("should throw if the baseBandwidth given is not a number", () => {
    expect(() =>
      parseConstructorOptions({ baseBandwidth: "a" as unknown as number }),
    ).toThrow();
    expect(() =>
      parseConstructorOptions({ baseBandwidth: /a/ as unknown as number }),
    ).toThrow();
    expect(() =>
      parseConstructorOptions({ baseBandwidth: {} as unknown as number }),
    ).toThrow();
  });
});

describe("API - parseLoadVideoOptions", () => {
  let parseLoadVideoOptions: typeof IParseLoadVideoOptions;
  beforeEach(async () => {
    warnOnceMock = vi.fn();
    logWarnMock = vi.fn();
    vi.doMock("../../../log", () => {
      return {
        default: {
          warn: logWarnMock,
        },
      };
    });
    vi.doMock("../../../utils/languages");
    vi.doMock("../../../utils/warn_once", () => {
      return { default: warnOnceMock };
    });
    parseLoadVideoOptions = (await vi.importActual("../option_utils"))
      .parseLoadVideoOptions as typeof IParseLoadVideoOptions;
  });

  afterEach(() => {
    vi.resetModules();
  });

  const defaultLoadVideoOptions = {
    __priv_manifestUpdateUrl: undefined,
    __priv_patchLastSegmentInSidx: undefined,
    checkMediaSegmentIntegrity: undefined,
    checkManifestIntegrity: undefined,
    defaultAudioTrackSwitchingMode: undefined,
    autoPlay: false,
    enableFastSwitching: true,
    initialManifest: undefined,
    keySystems: [],
    lowLatencyMode: false,
    manifestLoader: undefined,
    minimumManifestUpdateInterval: 0,
    mode: "auto",
    onCodecSwitch: "continue",
    requestConfig: {},
    referenceDateTime: undefined,
    representationFilter: undefined,
    serverSyncInfos: undefined,
    startAt: undefined,
    textTrackElement: undefined,
    textTrackMode: "native",
    url: undefined,
    experimentalOptions: {
      enableResolutionChecks: false,
    },
  };

  it("should throw if no option is given", () => {
    let err: unknown;
    let opt: unknown;
    try {
      opt = (parseLoadVideoOptions as unknown as () => void)();
    } catch (e) {
      err = e;
    }
    expect(opt).not.toBeDefined();
    expect(err).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(err instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(err.message).toEqual("No option set on loadVideo");
  });

  it("should throw if no url nor custom Manifest loader is given", () => {
    let err1: unknown;
    let opt1: unknown;
    let err2: unknown;
    let opt2: unknown;
    try {
      opt1 = parseLoadVideoOptions({} as unknown as ILoadVideoOptions);
    } catch (e) {
      err1 = e;
    }
    try {
      opt2 = parseLoadVideoOptions({ transport: "dash" });
    } catch (e) {
      err2 = e;
    }
    expect(opt1).not.toBeDefined();
    expect(err1).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(err1 instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(err1.message).toEqual(
      "Unable to load a content: no url set on loadVideo.\n" +
        "Please provide at least either an `url` argument, a " +
        "`initialManifest` option or a " +
        "`manifestLoader` option so the RxPlayer can load the content.",
    );
    expect(opt2).not.toBeDefined();
    expect(err2).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(err2 instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(err2.message).toEqual(
      "Unable to load a content: no url set on loadVideo.\n" +
        "Please provide at least either an `url` argument, a " +
        "`initialManifest` option or a " +
        "`manifestLoader` option so the RxPlayer can load the content.",
    );
  });

  it("should throw if no transport is given", () => {
    let err: unknown;
    let opt: unknown;
    try {
      opt = parseLoadVideoOptions({ url: "foo" } as unknown as ILoadVideoOptions);
    } catch (e) {
      err = e;
    }
    expect(opt).not.toBeDefined();
    expect(err).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(err instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(err.message).toEqual("No transport set on loadVideo");
  });

  it("should set a default object if both an url and transport is given", () => {
    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
    });
  });

  it("should set a default object if both a Manifest loader and transport is given", () => {
    const manifestLoader = (): never => {
      throw new Error("Should not execute");
    };
    expect(
      parseLoadVideoOptions({
        transport: "bar",
        manifestLoader,
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      transport: "bar",
      lowLatencyMode: false,
      manifestLoader,
    });
  });

  it("should set a default object if both an initialManifest and transport is given", () => {
    expect(
      parseLoadVideoOptions({
        transport: "bar",
        initialManifest: "test",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      transport: "bar",
      initialManifest: "test",
    });
  });

  it("should authorize setting an initialManifest option", () => {
    expect(
      parseLoadVideoOptions({
        initialManifest: "baz",
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      initialManifest: "baz",
    });
    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
        initialManifest: "",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      initialManifest: "",
    });
  });

  it("should authorize setting a autoPlay option", () => {
    expect(
      parseLoadVideoOptions({
        autoPlay: false,
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      autoPlay: false,
    });
    expect(
      parseLoadVideoOptions({
        autoPlay: true,
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      autoPlay: true,
    });
  });

  it("should authorize setting a keySystem option", () => {
    const keySystem1 = {
      type: "foo",
      getLicense: () => {
        return new Uint8Array([]);
      },
    };
    const keySystem2 = {
      type: "bar",
      getLicense: () => {
        return new Uint8Array([]);
      },
    };
    expect(
      parseLoadVideoOptions({
        keySystems: keySystem1 as unknown as IKeySystemOption[],
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      keySystems: [keySystem1],
    });
    expect(
      parseLoadVideoOptions({
        keySystems: [keySystem1, keySystem2],
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      keySystems: [keySystem1, keySystem2],
    });
  });

  it("should throw when setting an invalid keySystems option", () => {
    {
      let err: unknown;
      let opt: unknown;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          keySystems: {} as unknown as IKeySystemOption[],
        });
      } catch (e) {
        err = e;
      }
      expect(opt).not.toBeDefined();
      expect(err).toBeInstanceOf(Error);

      // Impossible check to shut-up TypeScript
      if (!(err instanceof Error)) {
        throw new Error("Impossible: already checked it was an Error instance");
      }
      expect(err.message).toEqual(
        "Invalid key system given: Missing type string or getLicense callback",
      );
    }
    {
      let err: unknown;
      let opt: unknown;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          keySystems: { type: "test" } as unknown as IKeySystemOption[],
        });
      } catch (e) {
        err = e;
      }
      expect(opt).not.toBeDefined();
      expect(err).toBeInstanceOf(Error);

      // Impossible check to shut-up TypeScript
      if (!(err instanceof Error)) {
        throw new Error("Impossible: already checked it was an Error instance");
      }
      expect(err.message).toEqual(
        "Invalid key system given: Missing type string or getLicense callback",
      );
    }
    {
      let err: unknown;
      let opt: unknown;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          keySystems: {
            getLicense: () => {
              return new Uint8Array([]);
            },
          } as unknown as IKeySystemOption[],
        });
      } catch (e) {
        err = e;
      }
      expect(opt).not.toBeDefined();
      expect(err).toBeInstanceOf(Error);

      // Impossible check to shut-up TypeScript
      if (!(err instanceof Error)) {
        throw new Error("Impossible: already checked it was an Error instance");
      }
      expect(err.message).toEqual(
        "Invalid key system given: Missing type string or getLicense callback",
      );
    }
  });

  it("should authorize setting a lowLatencyMode option", () => {
    expect(
      parseLoadVideoOptions({
        lowLatencyMode: false,
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      lowLatencyMode: false,
    });
    expect(
      parseLoadVideoOptions({
        lowLatencyMode: true,
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      lowLatencyMode: true,
      transport: "bar",
      url: "foo",
    });
  });

  it("should authorize setting a minimumManifestUpdateInterval option", () => {
    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
        minimumManifestUpdateInterval: 5400,
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      minimumManifestUpdateInterval: 5400,
      url: "foo",
      transport: "bar",
      lowLatencyMode: false,
    });
  });

  it("should authorize setting a valid defaultAudioTrackSwitchingMode option", () => {
    expect(
      parseLoadVideoOptions({
        defaultAudioTrackSwitchingMode: "direct",
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      defaultAudioTrackSwitchingMode: "direct",
    });

    expect(
      parseLoadVideoOptions({
        defaultAudioTrackSwitchingMode: "reload",
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      defaultAudioTrackSwitchingMode: "reload",
    });

    expect(
      parseLoadVideoOptions({
        defaultAudioTrackSwitchingMode: "seamless",
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      defaultAudioTrackSwitchingMode: "seamless",
    });
  });

  it("should set an 'undefined' defaultAudioTrackSwitchingMode mode when the parameter is invalid or not specified", () => {
    logWarnMock.mockReturnValue(undefined);
    expect(
      parseLoadVideoOptions({
        defaultAudioTrackSwitchingMode: "foo-bar" as unknown as IAudioTrackSwitchingMode,
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      defaultAudioTrackSwitchingMode: undefined,
    });
    expect(logWarnMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock).toHaveBeenCalledWith(
      "The `defaultAudioTrackSwitchingMode` loadVideo option must match one of " +
        `the following strategy name:
- \`seamless\`
- \`direct\`
- \`reload\``,
    );
    logWarnMock.mockReset();
    logWarnMock.mockReturnValue(undefined);

    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      defaultAudioTrackSwitchingMode: undefined,
    });
    expect(logWarnMock).not.toHaveBeenCalled();
  });

  it("should authorize setting a valid onCodecSwitch option", () => {
    expect(
      parseLoadVideoOptions({
        onCodecSwitch: "reload",
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      onCodecSwitch: "reload",
    });

    expect(
      parseLoadVideoOptions({
        onCodecSwitch: "continue",
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      onCodecSwitch: "continue",
    });
  });

  it("should set a 'continue' onCodecSwitch when the parameter is invalid or not specified", () => {
    logWarnMock.mockReturnValue(undefined);
    expect(
      parseLoadVideoOptions({
        onCodecSwitch: "foo-bar" as unknown as "continue",
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      onCodecSwitch: "continue",
    });
    expect(logWarnMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock).toHaveBeenCalledWith(
      "The `onCodecSwitch` loadVideo option must match one " +
        `of the following string:
- \`continue\`
- \`reload\`
If badly set, continue will be used as default`,
    );
    logWarnMock.mockReset();
    logWarnMock.mockReturnValue(undefined);

    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      onCodecSwitch: "continue",
    });
    expect(logWarnMock).not.toHaveBeenCalled();
  });

  it("should authorize setting a valid enableFastSwitching option", () => {
    expect(
      parseLoadVideoOptions({
        enableFastSwitching: false,
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      enableFastSwitching: false,
    });

    expect(
      parseLoadVideoOptions({
        enableFastSwitching: true,
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      enableFastSwitching: true,
    });
  });

  it("should authorize setting a requestConfig", () => {
    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
        requestConfig: {},
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      requestConfig: {},
    });
    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
        requestConfig: { manifest: { maxRetry: 4 } },
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      requestConfig: { manifest: { maxRetry: 4 } },
    });
    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
        requestConfig: { segment: { maxRetry: 3 } },
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      requestConfig: { segment: { maxRetry: 3 } },
    });
    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
        requestConfig: {
          segment: { maxRetry: 3 },
          manifest: { maxRetry: 5 },
        },
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      requestConfig: {
        segment: { maxRetry: 3 },
        manifest: { maxRetry: 5 },
      },
    });
  });

  it("should authorize setting a valid startAt option", () => {
    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
        startAt: { a: 12 } as unknown as IStartAtOption,
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      startAt: { a: 12 },
    });
    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
        startAt: { wallClockTime: 19 },
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      startAt: { wallClockTime: 19 },
    });
    const a = new Date();
    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
        startAt: { wallClockTime: a },
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      startAt: { wallClockTime: a.getTime() / 1000 },
    });
    expect(
      parseLoadVideoOptions({
        url: "foo",
        transport: "bar",
        startAt: { position: 4, wallClockTime: a },
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      startAt: { position: 4, wallClockTime: a.getTime() / 1000 },
    });
  });

  it("should authorize setting a `segmentLoader` option", () => {
    const func = vi.fn();
    expect(
      parseLoadVideoOptions({
        segmentLoader: func,
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      lowLatencyMode: false,
      segmentLoader: func,
    });
  });

  it("should authorize setting a valid textTrackMode option", () => {
    expect(
      parseLoadVideoOptions({
        textTrackMode: "native",
        url: "foo",
        transport: "bar",
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      textTrackMode: "native",
    });

    const textTrackElement = document.createElement("div");
    expect(
      parseLoadVideoOptions({
        textTrackMode: "html",
        url: "foo",
        transport: "bar",
        textTrackElement,
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      textTrackMode: "html",
      textTrackElement,
    });
  });

  it("should throw when setting an invalid textTrackMode option", () => {
    let err: unknown;
    let opt: unknown;
    try {
      opt = parseLoadVideoOptions({
        textTrackMode: "toto" as unknown as "html",
        url: "foo",
        transport: "bar",
      });
    } catch (e) {
      err = e;
    }
    expect(opt).not.toBeDefined();
    expect(err).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(err instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(err.message).toEqual("Invalid textTrackMode.");
  });

  it("should throw when setting an html textTrackMode option with no textTrackElement", () => {
    let err: unknown;
    let opt: unknown;
    try {
      opt = parseLoadVideoOptions({
        textTrackMode: "html",
        url: "foo",
        transport: "bar",
      });
    } catch (e) {
      err = e;
    }
    expect(opt).not.toBeDefined();
    expect(err).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(err instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(err.message).toEqual(
      'You have to provide a textTrackElement in "html" textTrackMode.',
    );
  });

  it("should throw when setting an html textTrackMode option with no textTrackElement", () => {
    let err: unknown;
    let opt: unknown;
    const textTrackElement = {};
    try {
      opt = parseLoadVideoOptions({
        textTrackMode: "html",
        url: "foo",
        transport: "bar",
        textTrackElement: textTrackElement as unknown as HTMLElement,
      });
    } catch (e) {
      err = e;
    }
    expect(opt).not.toBeDefined();
    expect(err).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(err instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(err.message).toEqual("textTrackElement should be an HTMLElement.");
  });

  it("should warn when setting a textTrackElement with a `native` textTrackMode", () => {
    logWarnMock.mockReturnValue(undefined);
    const textTrackElement = document.createElement("div");

    parseLoadVideoOptions({
      textTrackMode: "native",
      url: "foo",
      transport: "bar",
    });
    expect(logWarnMock).not.toHaveBeenCalled();

    expect(
      parseLoadVideoOptions({
        textTrackMode: "native",
        url: "foo",
        transport: "bar",
        textTrackElement,
      }),
    ).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      textTrackMode: "native",
    });

    expect(logWarnMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock).toHaveBeenCalledWith(
      "API: You have set a textTrackElement " +
        'without being in an "html" textTrackMode. It will be ignored.',
    );
  });
});

describe("API - checkReloadOptions", () => {
  let checkReloadOptions: typeof ICheckReloadOptions;
  beforeEach(async () => {
    checkReloadOptions = (await vi.importActual("../option_utils"))
      .checkReloadOptions as typeof ICheckReloadOptions;
  });
  it("Should valid undefined options", () => {
    const options = undefined;
    expect(() => checkReloadOptions(options)).not.toThrow();
  });
  it("Should valid empty options", () => {
    const options = {};
    expect(() => checkReloadOptions(options)).not.toThrow();
  });
  it("Should valid options with defined reloadAt.position", () => {
    const options = {
      reloadAt: {
        position: 4,
      },
    };
    expect(() => checkReloadOptions(options)).not.toThrow();
  });
  it("Should valid options with defined reloadAt.relative", () => {
    const options = {
      reloadAt: {
        relative: 3,
      },
    };
    expect(() => checkReloadOptions(options)).not.toThrow();
  });
  it("Should throw when invalid options", () => {
    const options = null;
    expect(() => checkReloadOptions(options as unknown as object)).toThrow(
      "API: reload - Invalid options format.",
    );
  });
  it("Should throw when invalid reloatAt", () => {
    const options = {
      reloadAt: 3,
    };
    expect(() => checkReloadOptions(options as unknown as object)).toThrow(
      "API: reload - Invalid 'reloadAt' option format.",
    );
  });
  it("Should throw when invalid position", () => {
    const options = {
      reloadAt: {
        position: "3",
      },
    };
    expect(() => checkReloadOptions(options as unknown as object)).toThrow(
      "API: reload - Invalid 'reloadAt.position' option format.",
    );
  });
  it("Should throw when invalid relative position", () => {
    const options = {
      reloadAt: {
        relative: "3",
      },
    };
    expect(() => checkReloadOptions(options as unknown as object)).toThrow(
      "API: reload - Invalid 'reloadAt.relative' option format.",
    );
  });
});
