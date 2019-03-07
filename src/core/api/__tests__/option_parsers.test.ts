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

// import objectAssign from "object-assign";
import config from "../../../config";
import log from "../../../log";
import {
  normalizeAudioTrack,
  normalizeTextTrack,
} from "../../../utils/languages";
import warnOnce from "../../../utils/warn_once";
import {
  parseConstructorOptions,
  parseLoadVideoOptions,
} from "../option_parsers";

jest.mock("../../../log");
jest.mock("../../../utils/languages");
jest.mock("../../../utils/warn_once");
const warnOnceMock = warnOnce as jest.Mock<ReturnType<typeof warnOnce>>;
const normalizeAudioTrackMock = normalizeAudioTrack as
  jest.Mock<ReturnType<typeof normalizeAudioTrack>>;
const normalizeTextTrackMock = normalizeTextTrack as
  jest.Mock<ReturnType<typeof normalizeTextTrack>>;
const logWarnMock = log.warn as jest.Mock<ReturnType<typeof log.warn>>;

const {
  // DEFAULT_AUTO_PLAY,
  DEFAULT_INITIAL_BITRATES,
  DEFAULT_LIMIT_VIDEO_WIDTH,
  // DEFAULT_MANUAL_BITRATE_SWITCHING_MODE,
  DEFAULT_MAX_BITRATES,
  DEFAULT_MAX_BUFFER_AHEAD,
  DEFAULT_MAX_BUFFER_BEHIND,
  // DEFAULT_SHOW_NATIVE_SUBTITLE,
  // DEFAULT_TEXT_TRACK_MODE,
  DEFAULT_THROTTLE_WHEN_HIDDEN,
  DEFAULT_WANTED_BUFFER_AHEAD,
} = config;

describe("API - parseConstructorOptions", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    warnOnceMock.mockReset();
    normalizeAudioTrackMock.mockReset();
    normalizeTextTrackMock.mockReset();
    logWarnMock.mockReset();
  });

  const videoElement = document.createElement("video");

  const defaultConstructorOptions = {
    maxBufferAhead: DEFAULT_MAX_BUFFER_AHEAD,
    maxBufferBehind: DEFAULT_MAX_BUFFER_BEHIND,
    wantedBufferAhead: DEFAULT_WANTED_BUFFER_AHEAD,
    limitVideoWidth: DEFAULT_LIMIT_VIDEO_WIDTH,
    throttleWhenHidden: DEFAULT_THROTTLE_WHEN_HIDDEN,
    videoElement,
    initialVideoBitrate: DEFAULT_INITIAL_BITRATES.video,
    initialAudioBitrate: DEFAULT_INITIAL_BITRATES.audio,
    maxAudioBitrate: DEFAULT_MAX_BITRATES.audio,
    maxVideoBitrate: DEFAULT_MAX_BITRATES.video,
    stopAtEnd: true,
    preferredAudioTracks: [],
    preferredTextTracks: [],
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
    expect(parseConstructorOptions({ throttleWhenHidden: false })).toEqual({
      ...defaultConstructorOptions,
      throttleWhenHidden: false,
    });
    expect(parseConstructorOptions({ throttleWhenHidden: true })).toEqual({
      ...defaultConstructorOptions,
      throttleWhenHidden: true,
    });
  });

  /* tslint:disable:max-line-length */
  it("should authorize setting a videoElement option which can be any media element", () => {
  /* tslint:enable:max-line-length */
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

  it("should authorize setting a maxVideoBitrate", () => {
    expect(parseConstructorOptions({ maxVideoBitrate: -1 })).toEqual({
      ...defaultConstructorOptions,
      maxVideoBitrate: -1,
    });
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

  it("should authorize setting a maxAudioBitrate", () => {
    expect(parseConstructorOptions({ maxAudioBitrate: -1 })).toEqual({
      ...defaultConstructorOptions,
      maxAudioBitrate: -1,
    });
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

  it("should authorize setting a stopAtEnd option", () => {
    expect(parseConstructorOptions({ stopAtEnd: false })).toEqual({
      ...defaultConstructorOptions,
      stopAtEnd: false,
    });
    expect(parseConstructorOptions({ stopAtEnd: true })).toEqual({
      ...defaultConstructorOptions,
      stopAtEnd: true,
    });
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
    normalizeAudioTrackMock.mockReset();
    normalizeTextTrackMock.mockReset();
  });

  const defaultLoadVideoOptions = {
    autoPlay: false,
    defaultAudioTrack: undefined,
    defaultTextTrack: undefined,
    hideNativeSubtitle: false,
    keySystems: [],
    manualBitrateSwitchingMode: false,
    networkConfig: {},
    startAt: undefined,
    supplementaryImageTracks: [],
    supplementaryTextTracks: [],
    textTrackElement: undefined,
    textTrackMode: "native",
    transportOptions: {},
  };

  it("should throw if no option is given", () => {
    let err;
    let opt;
    try {
      opt = (parseLoadVideoOptions as any)();
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(opt).not.toBeDefined();
    expect(err.message).toEqual("No url set on loadVideo");
  });

  it("should throw if no url is given", () => {
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
    expect(err1).toBeDefined();
    expect(opt1).not.toBeDefined();
    expect(err1.message).toEqual("No url set on loadVideo");
    expect(err2).toBeDefined();
    expect(opt2).not.toBeDefined();
    expect(err2.message).toEqual("No url set on loadVideo");
  });

  it("should throw if no transport is given", () => {
    let err;
    let opt;
    try {
      opt = (parseLoadVideoOptions as any)({ url: "foo" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(opt).not.toBeDefined();
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

  it("should normalize a defaultAudioTrack given but anounce its deprecation", () => {
    const track = { normalized: "fra", audioDescription: true, language: "fr" };
    warnOnceMock.mockReturnValue(undefined);
    normalizeAudioTrackMock.mockReturnValue(track);
    normalizeTextTrackMock.mockReturnValue(undefined);

    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      defaultAudioTrack: "Kankyō Ongaku" as any,
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      defaultAudioTrack: track,
    });
    expect(normalizeAudioTrackMock).toHaveBeenCalledTimes(1);
    expect(normalizeAudioTrackMock).toHaveBeenCalledWith("Kankyō Ongaku");
    expect(normalizeTextTrackMock).toHaveBeenCalledTimes(1);
    expect(normalizeTextTrackMock).toHaveBeenCalledWith(undefined);
    expect(warnOnceMock).toHaveBeenCalledTimes(1);
    expect(warnOnceMock).toHaveBeenCalledWith("The `defaultAudioTrack` loadVideo " +
      "option is deprecated.\n" +
      "Please use the `preferredAudioTracks` constructor option or the" +
      "`setPreferredAudioTracks` method instead");
  });

  it("should normalize a defaultTextTrack given but anounce its deprecation", () => {
    const track = { normalized: "fra", closedCaption: true, language: "fr" };
    warnOnceMock.mockReturnValue(undefined);
    normalizeAudioTrackMock.mockReturnValue(undefined);
    normalizeTextTrackMock.mockReturnValue(track);
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      defaultTextTrack: "Laurie Spiegel" as any,
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      defaultTextTrack: track,
    });
    expect(normalizeTextTrackMock).toHaveBeenCalledTimes(1);
    expect(normalizeTextTrackMock).toHaveBeenCalledWith("Laurie Spiegel");
    expect(normalizeAudioTrackMock).toHaveBeenCalledTimes(1);
    expect(normalizeAudioTrackMock).toHaveBeenCalledWith(undefined);
    expect(warnOnceMock).toHaveBeenCalledTimes(1);
    expect(warnOnceMock).toHaveBeenCalledWith("The `defaultTextTrack` loadVideo " +
      "option is deprecated.\n" +
      "Please use the `preferredTextTracks` constructor option or the" +
      "`setPreferredTextTracks` method instead");
  });

  it("should authorize setting a hideNativeSubtitle option", () => {
    expect(parseLoadVideoOptions({
      hideNativeSubtitle: false,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      hideNativeSubtitle: false,
    });
    expect(parseLoadVideoOptions({
      hideNativeSubtitle: true,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      hideNativeSubtitle: true,
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
      expect(err).toBeDefined();
      expect(opt).not.toBeDefined();
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
      expect(err).toBeDefined();
      expect(opt).not.toBeDefined();
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
      expect(err).toBeDefined();
      expect(opt).not.toBeDefined();
      expect(err.message).toEqual(
        "Invalid key system given: Missing type string or getLicense callback");
    }
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
      supplementaryImageTracks: [supplementaryImageTracks1],
    });
    expect(parseLoadVideoOptions({
      supplementaryImageTracks: [supplementaryImageTracks1, supplementaryImageTracks2],
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      supplementaryImageTracks: [supplementaryImageTracks1, supplementaryImageTracks2],
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
      expect(err).toBeDefined();
      expect(opt).not.toBeDefined();
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
      expect(err).toBeDefined();
      expect(opt).not.toBeDefined();
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
      expect(err).toBeDefined();
      expect(opt).not.toBeDefined();
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
      supplementaryTextTracks: [supplementaryTextTracks1],
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
      supplementaryTextTracks: [supplementaryTextTracks1, supplementaryTextTracks2],
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
      expect(err).toBeDefined();
      expect(opt).not.toBeDefined();
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
      expect(err).toBeDefined();
      expect(opt).not.toBeDefined();
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
      expect(err).toBeDefined();
      expect(opt).not.toBeDefined();
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
      expect(err).toBeDefined();
      expect(opt).not.toBeDefined();
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
      transportOptions: { segmentLoader: func },
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
    expect(err).toBeDefined();
    expect(opt).not.toBeDefined();
    expect(err.message).toEqual("Invalid textTrackMode.");
  });

  /* tslint:disable max-line-length */
  it("should throw when setting an html textTrackMode option with no textTrackElement", () => {
  /* tslint:enable max-line-length */
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
    expect(err).toBeDefined();
    expect(opt).not.toBeDefined();
    expect(err.message)
      .toEqual("You have to provide a textTrackElement in \"html\" textTrackMode.");
  });

  /* tslint:disable max-line-length */
  it("should throw when setting an html textTrackMode option with no textTrackElement", () => {
  /* tslint:enable max-line-length */
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
    expect(err).toBeDefined();
    expect(opt).not.toBeDefined();
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
});
