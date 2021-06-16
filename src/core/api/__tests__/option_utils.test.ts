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
/* eslint-disable @typescript-eslint/no-explicit-any */

import config from "../../../config";
import log from "../../../log";
import warnOnce from "../../../utils/warn_once";
import {
  checkReloadOptions,
  parseConstructorOptions,
  parseLoadVideoOptions,
} from "../option_utils";

jest.mock("../../../log");
jest.mock("../../../utils/languages");
jest.mock("../../../utils/warn_once");
const warnOnceMock = warnOnce as jest.Mock<ReturnType<typeof warnOnce>>;
const logWarnMock = log.warn as jest.Mock<ReturnType<typeof log.warn>>;

describe("API - parseConstructorOptions", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    warnOnceMock.mockReset();
    logWarnMock.mockReset();
  });

  const videoElement = document.createElement("video");
  const {
    // DEFAULT_AUTO_PLAY,
    DEFAULT_INITIAL_BITRATES,
    DEFAULT_LIMIT_VIDEO_WIDTH,
    // DEFAULT_MANUAL_BITRATE_SWITCHING_MODE,
    DEFAULT_MIN_BITRATES,
    DEFAULT_MAX_BITRATES,
    DEFAULT_MAX_BUFFER_AHEAD,
    DEFAULT_MAX_BUFFER_BEHIND,
    DEFAULT_MAX_VIDEO_BUFFER_SIZE,
    // DEFAULT_TEXT_TRACK_MODE,
    DEFAULT_THROTTLE_WHEN_HIDDEN,
    DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN,
    DEFAULT_WANTED_BUFFER_AHEAD,
  } = config.getCurrent();
  const defaultConstructorOptions = {
    maxVideoBufferSize: DEFAULT_MAX_VIDEO_BUFFER_SIZE,
    maxBufferAhead: DEFAULT_MAX_BUFFER_AHEAD,
    maxBufferBehind: DEFAULT_MAX_BUFFER_BEHIND,
    wantedBufferAhead: DEFAULT_WANTED_BUFFER_AHEAD,
    limitVideoWidth: DEFAULT_LIMIT_VIDEO_WIDTH,
    throttleWhenHidden: DEFAULT_THROTTLE_WHEN_HIDDEN,
    throttleVideoBitrateWhenHidden: DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN,
    videoElement,
    initialVideoBitrate: DEFAULT_INITIAL_BITRATES.video,
    initialAudioBitrate: DEFAULT_INITIAL_BITRATES.audio,
    minAudioBitrate: DEFAULT_MIN_BITRATES.audio,
    minVideoBitrate: DEFAULT_MIN_BITRATES.video,
    maxAudioBitrate: DEFAULT_MAX_BITRATES.audio,
    maxVideoBitrate: DEFAULT_MAX_BITRATES.video,
    preferredAudioTracks: [],
    preferredTextTracks: [],
    preferredVideoTracks: [],
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

  it("should authorize setting a limitVideoWidth option", () => {
    expect(parseConstructorOptions({ limitVideoWidth: false })).toEqual({
      ...defaultConstructorOptions,
      limitVideoWidth: false,
    });
    expect(parseConstructorOptions({ limitVideoWidth: true })).toEqual({
      ...defaultConstructorOptions,
      limitVideoWidth: true,
    });
  });

  it("should authorize setting a throttleWhenHidden option", () => {
    warnOnceMock.mockReturnValue(undefined);
    expect(parseConstructorOptions({ throttleWhenHidden: false })).toEqual({
      ...defaultConstructorOptions,
      throttleWhenHidden: false,
    });
    expect(warnOnceMock).toHaveBeenCalledTimes(1);
    expect(warnOnceMock)
      .toHaveBeenCalledWith("`throttleWhenHidden` API is deprecated. Consider using " +
                            "`throttleVideoBitrateWhenHidden` instead.");
    warnOnceMock.mockReset();

    expect(parseConstructorOptions({ throttleWhenHidden: true })).toEqual({
      ...defaultConstructorOptions,
      throttleWhenHidden: true,
    });
    expect(warnOnceMock).toHaveBeenCalledTimes(1);
    expect(warnOnceMock)
      .toHaveBeenCalledWith("`throttleWhenHidden` API is deprecated. Consider using " +
                            "`throttleVideoBitrateWhenHidden` instead.");
  });

  /* eslint-disable max-len */
  it("should not set `throttleVideoBitrateWhenHidden` if `throttleWhenHidden` is set", () => {
  /* eslint-enable max-len */
    warnOnceMock.mockReturnValue(undefined);
    expect(parseConstructorOptions({
      throttleWhenHidden: false,
      throttleVideoBitrateWhenHidden: true,
    })).toEqual({
      ...defaultConstructorOptions,
      throttleWhenHidden: false,
      throttleVideoBitrateWhenHidden: true,
    });
    expect(warnOnceMock).toHaveBeenCalledTimes(1);
    expect(warnOnceMock)
      .toHaveBeenCalledWith("`throttleWhenHidden` API is deprecated. Consider using " +
                            "`throttleVideoBitrateWhenHidden` instead.");
    warnOnceMock.mockReset();

    expect(parseConstructorOptions({
      throttleWhenHidden: true,
      throttleVideoBitrateWhenHidden: true,
    })).toEqual({
      ...defaultConstructorOptions,
      throttleWhenHidden: true,
      throttleVideoBitrateWhenHidden: false,
    });
    expect(warnOnceMock).toHaveBeenCalledTimes(1);
    expect(warnOnceMock)
      .toHaveBeenCalledWith("`throttleWhenHidden` API is deprecated. Consider using " +
                            "`throttleVideoBitrateWhenHidden` instead.");
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

  /* eslint-disable max-len */
  it("should authorize setting a videoElement option which can be any media element", () => {
  /* eslint-enable max-len */
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

  it("should authorize setting an initialVideoBitrate", () => {
    expect(parseConstructorOptions({ initialVideoBitrate: -1 })).toEqual({
      ...defaultConstructorOptions,
      initialVideoBitrate: -1,
    });
    expect(parseConstructorOptions({ initialVideoBitrate: 0 })).toEqual({
      ...defaultConstructorOptions,
      initialVideoBitrate: 0,
    });
    expect(parseConstructorOptions({ initialVideoBitrate: 10 })).toEqual({
      ...defaultConstructorOptions,
      initialVideoBitrate: 10,
    });
    expect(parseConstructorOptions({ initialVideoBitrate: Infinity })).toEqual({
      ...defaultConstructorOptions,
      initialVideoBitrate: Infinity,
    });
  });

  it("should authorize setting an initialAudioBitrate", () => {
    expect(parseConstructorOptions({ initialAudioBitrate: -1 })).toEqual({
      ...defaultConstructorOptions,
      initialAudioBitrate: -1,
    });
    expect(parseConstructorOptions({ initialAudioBitrate: 0 })).toEqual({
      ...defaultConstructorOptions,
      initialAudioBitrate: 0,
    });
    expect(parseConstructorOptions({ initialAudioBitrate: 10 })).toEqual({
      ...defaultConstructorOptions,
      initialAudioBitrate: 10,
    });
    expect(parseConstructorOptions({ initialAudioBitrate: Infinity })).toEqual({
      ...defaultConstructorOptions,
      initialAudioBitrate: Infinity,
    });
  });

  it("should authorize setting a minVideoBitrate", () => {
    expect(parseConstructorOptions({ minVideoBitrate: -1 })).toEqual({
      ...defaultConstructorOptions,
      minVideoBitrate: -1,
    });
    expect(parseConstructorOptions({ minVideoBitrate: 0 })).toEqual({
      ...defaultConstructorOptions,
      minVideoBitrate: 0,
    });
    expect(parseConstructorOptions({ minVideoBitrate: 10 })).toEqual({
      ...defaultConstructorOptions,
      minVideoBitrate: 10,
    });
    expect(parseConstructorOptions({ minVideoBitrate: Infinity })).toEqual({
      ...defaultConstructorOptions,
      minVideoBitrate: Infinity,
    });
  });

  it("should authorize setting a minAudioBitrate", () => {
    expect(parseConstructorOptions({ minAudioBitrate: -1 })).toEqual({
      ...defaultConstructorOptions,
      minAudioBitrate: -1,
    });
    expect(parseConstructorOptions({ minAudioBitrate: 0 })).toEqual({
      ...defaultConstructorOptions,
      minAudioBitrate: 0,
    });
    expect(parseConstructorOptions({ minAudioBitrate: 10 })).toEqual({
      ...defaultConstructorOptions,
      minAudioBitrate: 10,
    });
    expect(parseConstructorOptions({ minAudioBitrate: Infinity })).toEqual({
      ...defaultConstructorOptions,
      minAudioBitrate: Infinity,
    });
  });

  it("should authorize setting a maxVideoBitrate", () => {
    expect(parseConstructorOptions({ maxVideoBitrate: 0 })).toEqual({
      ...defaultConstructorOptions,
      maxVideoBitrate: 0,
    });
    expect(parseConstructorOptions({ maxVideoBitrate: 10 })).toEqual({
      ...defaultConstructorOptions,
      maxVideoBitrate: 10,
    });
    expect(parseConstructorOptions({ maxVideoBitrate: Infinity })).toEqual({
      ...defaultConstructorOptions,
      maxVideoBitrate: Infinity,
    });
  });

  it("should throw when setting a maxVideoBitrate inferior to minVideoBitrate", () => {
    expect(() => parseConstructorOptions({ maxVideoBitrate: -1 }))
      .toThrow(new Error("Invalid maxVideoBitrate parameter. " +
                         "Its value, \"-1\", is inferior to the set " +
                         "minVideoBitrate, \"0\""));
    expect(() => parseConstructorOptions({ minVideoBitrate: 100,
                                           maxVideoBitrate: 0 }))
      .toThrow(new Error("Invalid maxVideoBitrate parameter. " +
                         "Its value, \"0\", is inferior to the set " +
                         "minVideoBitrate, \"100\""));
    expect(() => parseConstructorOptions({ minVideoBitrate: 10000,
                                           maxVideoBitrate: 9999 }))
      .toThrow(new Error("Invalid maxVideoBitrate parameter. " +
                         "Its value, \"9999\", is inferior to the set " +
                         "minVideoBitrate, \"10000\""));
  });

  it("should authorize setting a maxAudioBitrate", () => {
    expect(parseConstructorOptions({ maxAudioBitrate: 0 })).toEqual({
      ...defaultConstructorOptions,
      maxAudioBitrate: 0,
    });
    expect(parseConstructorOptions({ maxAudioBitrate: 10 })).toEqual({
      ...defaultConstructorOptions,
      maxAudioBitrate: 10,
    });
    expect(parseConstructorOptions({ maxAudioBitrate: Infinity })).toEqual({
      ...defaultConstructorOptions,
      maxAudioBitrate: Infinity,
    });
  });

  it("should throw when setting a maxAudioBitrate inferior to minAudioBitrate", () => {
    expect(() => parseConstructorOptions({ maxAudioBitrate: -1 }))
      .toThrow(new Error("Invalid maxAudioBitrate parameter. " +
                         "Its value, \"-1\", is inferior to the set " +
                         "minAudioBitrate, \"0\""));
    expect(() => parseConstructorOptions({ minAudioBitrate: 100,
                                           maxAudioBitrate: 0 }))
      .toThrow(new Error("Invalid maxAudioBitrate parameter. " +
                         "Its value, \"0\", is inferior to the set " +
                         "minAudioBitrate, \"100\""));
    expect(() => parseConstructorOptions({ minAudioBitrate: 10000,
                                           maxAudioBitrate: 9999 }))
      .toThrow(new Error("Invalid maxAudioBitrate parameter. " +
                         "Its value, \"9999\", is inferior to the set " +
                         "minAudioBitrate, \"10000\""));
  });

  it("should authorize setting a preferredAudioTracks option", () => {
    const preferredAudioTracks = [
      { language: "fra", audioDescription: false },
      null,
    ];
    expect(parseConstructorOptions({ preferredAudioTracks })).toEqual({
      ...defaultConstructorOptions,
      preferredAudioTracks,
    });
  });

  it("should authorize setting a preferredTextTracks option", () => {
    const preferredTextTracks = [
      { language: "fra", closedCaption: false },
      null,
    ];
    expect(parseConstructorOptions({ preferredTextTracks })).toEqual({
      ...defaultConstructorOptions,
      preferredTextTracks,
    });
  });

  it("should authorize setting a preferredVideoTracks option", () => {
    const preferredVideoTracks = [
      { codec: { all: true, test: /hvc/ } },
      null,
    ];
    expect(parseConstructorOptions({ preferredVideoTracks })).toEqual({
      ...defaultConstructorOptions,
      preferredVideoTracks,
    });
  });

  it("should throw if the maxBufferAhead given is not a number", () => {
    expect(() => parseConstructorOptions({ maxBufferAhead: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ maxBufferAhead: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ maxBufferAhead: {} as any })).toThrow();
  });

  it("should throw if the maxBufferBehind given is not a number", () => {
    expect(() => parseConstructorOptions({ maxBufferBehind: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ maxBufferBehind: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ maxBufferBehind: {} as any })).toThrow();
  });

  it("should throw if the wantedBufferAhead given is not a number", () => {
    expect(() => parseConstructorOptions({ wantedBufferAhead: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ wantedBufferAhead: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ wantedBufferAhead: {} as any })).toThrow();
  });

  it("should throw if the videoElement given is not an HTMLMediaElement", () => {
    expect(() => parseConstructorOptions({ videoElement: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ videoElement: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ videoElement: {} as any })).toThrow();
    expect(() => parseConstructorOptions({ videoElement: [] as any })).toThrow();
    expect(() => parseConstructorOptions({ videoElement: 0 as any })).toThrow();
    expect(() => parseConstructorOptions({
      videoElement: document.createElement("div") as any,
    })).toThrow();
  });

  it("should throw if the initialVideoBitrate given is not a number", () => {
    expect(() => parseConstructorOptions({ initialVideoBitrate: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ initialVideoBitrate: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ initialVideoBitrate: {} as any })).toThrow();
  });

  it("should throw if the initialAudioBitrate given is not a number", () => {
    expect(() => parseConstructorOptions({ initialAudioBitrate: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ initialAudioBitrate: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ initialAudioBitrate: {} as any })).toThrow();
  });

  it("should throw if the minVideoBitrate given is not a number", () => {
    expect(() => parseConstructorOptions({ minVideoBitrate: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ minVideoBitrate: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ minVideoBitrate: {} as any })).toThrow();
  });

  it("should throw if the minAudioBitrate given is not a number", () => {
    expect(() => parseConstructorOptions({ minAudioBitrate: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ minAudioBitrate: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ minAudioBitrate: {} as any })).toThrow();
  });

  it("should throw if the maxVideoBitrate given is not a number", () => {
    expect(() => parseConstructorOptions({ maxVideoBitrate: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ maxVideoBitrate: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ maxVideoBitrate: {} as any })).toThrow();
  });

  it("should throw if the maxAudioBitrate given is not a number", () => {
    expect(() => parseConstructorOptions({ maxAudioBitrate: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ maxAudioBitrate: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ maxAudioBitrate: {} as any })).toThrow();
  });
});

describe("API - parseLoadVideoOptions", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    warnOnceMock.mockReset();
  });

  const defaultLoadVideoOptions = {
    audioTrackSwitchingMode: "seamless",
    autoPlay: false,
    enableFastSwitching: true,
    initialManifest: undefined,
    keySystems: [],
    lowLatencyMode: false,
    manualBitrateSwitchingMode: "seamless",
    minimumManifestUpdateInterval: 0,
    onCodecSwitch: "continue",
    networkConfig: {},
    startAt: undefined,
    textTrackElement: undefined,
    textTrackMode: "native",
    transportOptions: {
      lowLatencyMode: false,
      supplementaryTextTracks: [],
      supplementaryImageTracks: [],
    },
    url: undefined,
  };

  it("should throw if no option is given", () => {
    let err;
    let opt;
    try {
      opt = (parseLoadVideoOptions as any)();
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
    let err1;
    let opt1;
    let err2;
    let opt2;
    try {
      opt1 = (parseLoadVideoOptions as any)({});
    } catch (e) {
      err1 = e;
    }
    try {
      opt2 = (parseLoadVideoOptions as any)({ transport: "dash" });
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
      "`transportOptions.initialManifest` option or a " +
      "`transportOptions.manifestLoader` option so the RxPlayer can load the content."
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
      "`transportOptions.initialManifest` option or a " +
      "`transportOptions.manifestLoader` option so the RxPlayer can load the content."
    );
  });

  it("should throw if no transport is given", () => {
    let err;
    let opt;
    try {
      opt = (parseLoadVideoOptions as any)({ url: "foo" });
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
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
    });
  });

  /* eslint-disable max-len */
  it("should set a default object if both a Manifest loader and transport is given", () => {
  /* eslint-enable max-len */
    const manifestLoader = () : never => {
      throw new Error("Should not execute");
    };
    expect(parseLoadVideoOptions({
      transport: "bar",
      transportOptions: { manifestLoader },
    })).toEqual({
      ...defaultLoadVideoOptions,
      transport: "bar",
      transportOptions: { lowLatencyMode: false,
                          manifestLoader,
                          supplementaryImageTracks: [],
                          supplementaryTextTracks: [] },
    });
  });

  /* eslint-disable max-len */
  it("should set a default object if both an initialManifest and transport is given", () => {
  /* eslint-enable max-len */
    expect(parseLoadVideoOptions({
      transport: "bar",
      transportOptions: { initialManifest: "test" },
    })).toEqual({
      ...defaultLoadVideoOptions,
      transport: "bar",
      initialManifest: "test",
    });
  });

  it("should authorize setting an initialManifest option", () => {
    expect(parseLoadVideoOptions({
      transportOptions: { initialManifest: "baz" },
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      initialManifest: "baz",
    });
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      transportOptions: { initialManifest: "" },
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      initialManifest: "",
    });
  });

  it("should authorize setting a autoPlay option", () => {
    expect(parseLoadVideoOptions({
      autoPlay: false,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      autoPlay: false,
    });
    expect(parseLoadVideoOptions({
      autoPlay: true,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      autoPlay: true,
    });
  });

  it("should authorize setting a keySystem option", () => {
    const keySystem1 = {
      type: "foo",
      getLicense: () => { return new Uint8Array([]); },
    };
    const keySystem2 = {
      type: "bar",
      getLicense: () => { return new Uint8Array([]); },
    };
    expect(parseLoadVideoOptions({
      keySystems: keySystem1 as any,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      keySystems: [keySystem1],
    });
    expect(parseLoadVideoOptions({
      keySystems: [keySystem1, keySystem2],
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      keySystems: [keySystem1, keySystem2],
    });
  });

  it("should throw when setting an invalid keySystems option", () => {
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          keySystems: {} as any,
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
        "Invalid key system given: Missing type string or getLicense callback");
    }
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          keySystems: { type: "test" } as any,
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
        "Invalid key system given: Missing type string or getLicense callback");
    }
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          keySystems: { getLicense: () => { return new Uint8Array([]); } } as any ,
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
        "Invalid key system given: Missing type string or getLicense callback");
    }
  });

  it("should authorize setting a lowLatencyMode option", () => {
    expect(parseLoadVideoOptions({
      lowLatencyMode: false,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      lowLatencyMode: false,
    });
    expect(parseLoadVideoOptions({
      lowLatencyMode: true,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      lowLatencyMode: true,
      transport: "bar",
      url: "foo",
      transportOptions: { lowLatencyMode: true,
                          supplementaryImageTracks: [],
                          supplementaryTextTracks: [] },
    });
  });

  it("should authorize setting a minimumManifestUpdateInterval option", () => {
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      transportOptions: {
        minimumManifestUpdateInterval: 5400,
      },
    })).toEqual({
      ...defaultLoadVideoOptions,
      minimumManifestUpdateInterval: 5400,
      url: "foo",
      transport: "bar",
      transportOptions: {
        lowLatencyMode: false,
        supplementaryImageTracks: [],
        supplementaryTextTracks: [],
      },
    });
  });

  it("should authorize setting a valid manualBitrateSwitchingMode option", () => {
    expect(parseLoadVideoOptions({
      manualBitrateSwitchingMode: "direct",
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      manualBitrateSwitchingMode: "direct",
    });

    expect(parseLoadVideoOptions({
      manualBitrateSwitchingMode: "seamless",
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      manualBitrateSwitchingMode: "seamless",
    });
  });

  it("should authorize setting a valid audioTrackSwitchingMode option", () => {
    expect(parseLoadVideoOptions({
      audioTrackSwitchingMode: "direct",
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      audioTrackSwitchingMode: "direct",
    });

    expect(parseLoadVideoOptions({
      audioTrackSwitchingMode: "reload",
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      audioTrackSwitchingMode: "reload",
    });

    expect(parseLoadVideoOptions({
      audioTrackSwitchingMode: "seamless",
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      audioTrackSwitchingMode: "seamless",
    });
  });

  // eslint-disable-next-line max-len
  it("should set a 'seamless' audioTrackSwitching mode when the parameter is invalid or not specified", () => {
    logWarnMock.mockReturnValue(undefined);
    expect(parseLoadVideoOptions({
      audioTrackSwitchingMode: "foo-bar" as any,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      audioTrackSwitchingMode: "seamless",
    });
    expect(logWarnMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock)
      .toHaveBeenCalledWith(
        "The `audioTrackSwitchingMode` loadVideo option must match one of " +
        `the following strategy name:
- \`seamless\`
- \`direct\`
- \`reload\`
If badly set, seamless strategy will be used as default`);
    logWarnMock.mockReset();
    logWarnMock.mockReturnValue(undefined);

    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      audioTrackSwitchingMode: "seamless",
    });
    expect(logWarnMock).not.toHaveBeenCalled();
  });

  it("should authorize setting a valid onCodecSwitch option", () => {
    expect(parseLoadVideoOptions({
      onCodecSwitch: "reload",
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      onCodecSwitch: "reload",
    });

    expect(parseLoadVideoOptions({
      onCodecSwitch: "continue",
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      onCodecSwitch: "continue",
    });
  });

  /* eslint-disable-next-line max-len */
  it("should set a 'continue' onCodecSwitch when the parameter is invalid or not specified", () => {
    logWarnMock.mockReturnValue(undefined);
    expect(parseLoadVideoOptions({
      onCodecSwitch: "foo-bar" as any,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      onCodecSwitch: "continue",
    });
    expect(logWarnMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock)
      .toHaveBeenCalledWith("The `onCodecSwitch` loadVideo option must match one " +
                            `of the following string:
- \`continue\`
- \`reload\`
If badly set, continue will be used as default`);
    logWarnMock.mockReset();
    logWarnMock.mockReturnValue(undefined);

    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      onCodecSwitch: "continue",
    });
    expect(logWarnMock).not.toHaveBeenCalled();
  });

  it("should authorize setting a valid enableFastSwitching option", () => {
    expect(parseLoadVideoOptions({
      enableFastSwitching: false,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      enableFastSwitching: false,
    });

    expect(parseLoadVideoOptions({
      enableFastSwitching: true,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      enableFastSwitching: true,
    });
  });

  it("should authorize setting a networkConfig", () => {
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      networkConfig: {},
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      networkConfig: {},
    });
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      networkConfig: { manifestRetry: 4 },
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      networkConfig: { manifestRetry: 4 },
    });
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      networkConfig: { offlineRetry: 7 },
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      networkConfig: { offlineRetry: 7 },
    });
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      networkConfig: { segmentRetry: 3 },
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      networkConfig: { segmentRetry: 3 },
    });
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      networkConfig: {
        offlineRetry: 10,
        segmentRetry: 3,
        manifestRetry: 5,
      },
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      networkConfig: {
        offlineRetry: 10,
        segmentRetry: 3,
        manifestRetry: 5,
      },
    });
  });

  it("should authorize setting a valid startAt option", () => {
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      startAt: { a: 12 } as any,
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      startAt: { a: 12 },
    });
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      startAt: { wallClockTime: 19 },
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      startAt: { wallClockTime: 19 },
    });
    const a = new Date();
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      startAt: { wallClockTime: a },
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      startAt: { wallClockTime: a.getTime() / 1000 },
    });
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      startAt: { position: 4, wallClockTime: a },
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      startAt: { position: 4, wallClockTime: a.getTime() / 1000 },
    });
  });

  it("should authorize setting a supplementaryImageTracks option", () => {
    const supplementaryImageTracks1 = {
      url: "foo",
      mimeType: "bar/baz",
    };
    const supplementaryImageTracks2 = {
      url: "bar",
      mimeType: "toto",
    };
    expect(parseLoadVideoOptions({
      supplementaryImageTracks: supplementaryImageTracks1 as any,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      transportOptions: {
        lowLatencyMode: false,
        supplementaryImageTracks: [supplementaryImageTracks1],
        supplementaryTextTracks: [],
      },
    });
    expect(parseLoadVideoOptions({
      supplementaryImageTracks: [supplementaryImageTracks1, supplementaryImageTracks2],
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      transportOptions: {
        lowLatencyMode: false,
        supplementaryImageTracks: [ supplementaryImageTracks1,
                                    supplementaryImageTracks2 ],
        supplementaryTextTracks: [],
      },
    });
  });

  it("should throw when setting an invalid supplementaryImageTracks option", () => {
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          supplementaryImageTracks: {} as any,
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
        "Invalid supplementary image track given. Missing either mimetype or url");
    }
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          supplementaryImageTracks: { url: "test" } as any,
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
        "Invalid supplementary image track given. Missing either mimetype or url");
    }
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          supplementaryImageTracks: { mimeType: "test" } as any,
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
        "Invalid supplementary image track given. Missing either mimetype or url");
    }
  });

  it("should authorize setting a supplementaryTextTracks option", () => {
    const supplementaryTextTracks1 = {
      url: "foo",
      mimeType: "bar/baz",
      language: "fr",
    };
    const supplementaryTextTracks2 = {
      url: "bar",
      mimeType: "toto",
      language: "en",
    };
    expect(parseLoadVideoOptions({
      supplementaryTextTracks: supplementaryTextTracks1 as any,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      transportOptions: {
        lowLatencyMode: false,
        supplementaryImageTracks: [],
        supplementaryTextTracks: [supplementaryTextTracks1],
      },
    });
    expect(parseLoadVideoOptions({
      supplementaryTextTracks: [
        supplementaryTextTracks1,
        supplementaryTextTracks2,
      ] as any,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      transportOptions: {
        lowLatencyMode: false,
        supplementaryImageTracks: [],
        supplementaryTextTracks: [supplementaryTextTracks1, supplementaryTextTracks2],
      },
    });
  });

  it("should throw when setting an invalid supplementaryTextTracks option", () => {
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          supplementaryTextTracks: {} as any,
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
        "Invalid supplementary text track given." +
        " Missing either language, mimetype or url");
    }
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          supplementaryTextTracks: { url: "test", language: "toto" } as any,
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
        "Invalid supplementary text track given." +
        " Missing either language, mimetype or url");
    }
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          supplementaryTextTracks: { mimeType: "test", language: "toto" } as any,
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
        "Invalid supplementary text track given." +
        " Missing either language, mimetype or url");
    }
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          supplementaryTextTracks: { url: "test", mimeType: "toto" } as any,
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
        "Invalid supplementary text track given." +
        " Missing either language, mimetype or url");
    }
  });

  it("should authorize setting a transportOptions option", () => {
    const func = jest.fn();
    expect(parseLoadVideoOptions({
      transportOptions: { segmentLoader: func },
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      transportOptions: { lowLatencyMode: false,
                          supplementaryImageTracks: [],
                          supplementaryTextTracks: [],
                          segmentLoader: func },
    });
  });

  it("should authorize setting a valid textTrackMode option", () => {
    expect(parseLoadVideoOptions({
      textTrackMode: "native",
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      textTrackMode: "native",
    });

    const textTrackElement = document.createElement("div");
    expect(parseLoadVideoOptions({
      textTrackMode: "html",
      url: "foo",
      transport: "bar",
      textTrackElement,
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      textTrackMode: "html",
      textTrackElement,
    });
  });

  it("should throw when setting an invalid textTrackMode option", () => {
    let err;
    let opt;
    try {
      opt = parseLoadVideoOptions({
        textTrackMode: "toto" as any,
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

  /* eslint-disable max-len */
  it("should throw when setting an html textTrackMode option with no textTrackElement", () => {
  /* eslint-enable max-len */
    let err;
    let opt;
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
    expect(err.message)
      .toEqual("You have to provide a textTrackElement in \"html\" textTrackMode.");
  });

  /* eslint-disable max-len */
  it("should throw when setting an html textTrackMode option with no textTrackElement", () => {
  /* eslint-enable max-len */
    let err;
    let opt;
    const textTrackElement = {};
    try {
      opt = parseLoadVideoOptions({
        textTrackMode: "html",
        url: "foo",
        transport: "bar",
        textTrackElement: textTrackElement as any,
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
    expect(err.message)
      .toEqual("textTrackElement should be an HTMLElement.");
  });

  it("should warn when setting a textTrackElement with a `native` textTrackMode", () => {
    logWarnMock.mockReturnValue(undefined);
    const textTrackElement = document.createElement("div");

    parseLoadVideoOptions({ textTrackMode: "native", url: "foo", transport: "bar" });
    expect(logWarnMock).not.toHaveBeenCalled();

    expect(parseLoadVideoOptions({
      textTrackMode: "native",
      url: "foo",
      transport: "bar",
      textTrackElement,
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      textTrackMode: "native",
    });

    expect(logWarnMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock).toHaveBeenCalledWith("API: You have set a textTrackElement " +
      "without being in an \"html\" textTrackMode. It will be ignored.");
  });

  /* eslint-disable max-len */
  it("should set non-documented variables in `transportOptions`", () => {
  /* eslint-enable max-len */
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      transportOptions: { __priv_toto: 4 } as any,
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      transportOptions: { lowLatencyMode: false,
                          __priv_toto: 4,
                          supplementaryImageTracks: [],
                          supplementaryTextTracks: [] },
    });
  });
});

describe("API - checkReloadOptions", () => {
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
    expect(() => checkReloadOptions(options as any))
      .toThrow("API: reload - Invalid options format.");
  });
  it("Should throw when invalid reloatAt", () => {
    const options = {
      reloadAt: 3,
    };
    expect(() => checkReloadOptions(options as any))
      .toThrow("API: reload - Invalid 'reloadAt' option format.");
  });
  it("Should throw when invalid position", () => {
    const options = {
      reloadAt: {
        position: "3",
      },
    };
    expect(() => checkReloadOptions(options as any))
      .toThrow("API: reload - Invalid 'reloadAt.position' option format.");
  });
  it("Should throw when invalid relative position", () => {
    const options = {
      reloadAt: {
        relative: "3",
      },
    };
    expect(() => checkReloadOptions(options as any))
      .toThrow("API: reload - Invalid 'reloadAt.relative' option format.");
  });
});
