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

import config from "../../../config";

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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
    expect(parseConstructorOptions({})).toEqual(defaultConstructorOptions);
  });

  it("should authorize setting a maxBufferAhead", () => {
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
    expect(parseConstructorOptions({ preferredTextTracks })).toEqual({
      ...defaultConstructorOptions,
      preferredTextTracks,
    });
  });

  it("should throw if the maxBufferAhead given is not a number", () => {
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
    expect(() => parseConstructorOptions({ maxBufferAhead: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ maxBufferAhead: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ maxBufferAhead: {} as any })).toThrow();
  });

  it("should throw if the maxBufferBehind given is not a number", () => {
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
    expect(() => parseConstructorOptions({ maxBufferBehind: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ maxBufferBehind: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ maxBufferBehind: {} as any })).toThrow();
  });

  it("should throw if the wantedBufferAhead given is not a number", () => {
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
    expect(() => parseConstructorOptions({ wantedBufferAhead: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ wantedBufferAhead: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ wantedBufferAhead: {} as any })).toThrow();
  });

  it("should throw if the videoElement given is not an HTMLMediaElement", () => {
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
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
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
    expect(() => parseConstructorOptions({ initialVideoBitrate: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ initialVideoBitrate: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ initialVideoBitrate: {} as any })).toThrow();
  });

  it("should throw if the initialAudioBitrate given is not a number", () => {
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
    expect(() => parseConstructorOptions({ initialAudioBitrate: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ initialAudioBitrate: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ initialAudioBitrate: {} as any })).toThrow();
  });

  it("should throw if the maxVideoBitrate given is not a number", () => {
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
    expect(() => parseConstructorOptions({ maxVideoBitrate: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ maxVideoBitrate: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ maxVideoBitrate: {} as any })).toThrow();
  });

  it("should throw if the maxAudioBitrate given is not a number", () => {
    const parseConstructorOptions = require("../option_parsers").parseConstructorOptions;
    expect(() => parseConstructorOptions({ maxAudioBitrate: "a" as any })).toThrow();
    expect(() => parseConstructorOptions({ maxAudioBitrate: /a/ as any })).toThrow();
    expect(() => parseConstructorOptions({ maxAudioBitrate: {} as any })).toThrow();
  });
});

describe("API - parseLoadVideoOptions", () => {
  beforeEach(() => {
    jest.resetModules();
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    let err;
    let opt;
    try {
      opt = parseLoadVideoOptions();
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(opt).not.toBeDefined();
    expect(err.message).toEqual("No url set on loadVideo");
  });

  it("should throw if no url is given", () => {
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    let err1;
    let opt1;
    let err2;
    let opt2;
    try {
      opt1 = parseLoadVideoOptions({});
    } catch (e) {
      err1 = e;
    }
    try {
      opt2 = parseLoadVideoOptions({ transport: "dash" });
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    let err;
    let opt;
    try {
      opt = parseLoadVideoOptions({ url: "foo" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(opt).not.toBeDefined();
    expect(err.message).toEqual("No transport set on loadVideo");
  });

  it("should set a default object if both an url and transport is given", () => {
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
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
    const warnOnceSpy = jest.fn();
    jest.mock("../../../utils/warn_once", () => ({ default: warnOnceSpy }));
    const track = { normalized: "fra", audioDescription: true };
    const normalizeAudioTrackSpy = jest.fn(() => track);
    const normalizeTextTrackSpy = jest.fn(() => undefined);
    jest.mock("../../../utils/languages", () => ({
      normalizeAudioTrack: normalizeAudioTrackSpy,
      normalizeTextTrack: normalizeTextTrackSpy,
    }));
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      defaultAudioTrack: "Kankyō Ongaku",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      defaultAudioTrack: track,
    });
    expect(normalizeAudioTrackSpy).toHaveBeenCalledTimes(1);
    expect(normalizeAudioTrackSpy).toHaveBeenCalledWith("Kankyō Ongaku");
    expect(normalizeTextTrackSpy).toHaveBeenCalledTimes(1);
    expect(normalizeTextTrackSpy).toHaveBeenCalledWith(undefined);
    expect(warnOnceSpy).toHaveBeenCalledTimes(1);
    expect(warnOnceSpy).toHaveBeenCalledWith("The `defaultAudioTrack` loadVideo " +
      "option is deprecated.\n" +
      "Please use the `preferredAudioTracks` constructor option or the" +
      "`setPreferredAudioTracks` method instead");
    normalizeTextTrackSpy.mockReset();
    normalizeAudioTrackSpy.mockReset();
    warnOnceSpy.mockReset();
  });

  it("should normalize a defaultTextTrack given but anounce its deprecation", () => {
    const warnOnceSpy = jest.fn();
    jest.mock("../../../utils/warn_once", () => ({ default: warnOnceSpy }));
    const track = { normalized: "fra", closedCaption: true };
    const normalizeTextTrackSpy = jest.fn(() => track);
    const normalizeAudioTrackSpy = jest.fn(() => undefined);
    jest.mock("../../../utils/languages", () => ({
      normalizeAudioTrack: normalizeAudioTrackSpy,
      normalizeTextTrack: normalizeTextTrackSpy,
    }));
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      defaultTextTrack: "Laurie Spiegel",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      defaultTextTrack: track,
    });
    expect(normalizeTextTrackSpy).toHaveBeenCalledTimes(1);
    expect(normalizeTextTrackSpy).toHaveBeenCalledWith("Laurie Spiegel");
    expect(normalizeAudioTrackSpy).toHaveBeenCalledTimes(1);
    expect(normalizeAudioTrackSpy).toHaveBeenCalledWith(undefined);
    expect(warnOnceSpy).toHaveBeenCalledTimes(1);
    expect(warnOnceSpy).toHaveBeenCalledWith("The `defaultTextTrack` loadVideo " +
      "option is deprecated.\n" +
      "Please use the `preferredTextTracks` constructor option or the" +
      "`setPreferredTextTracks` method instead");
    normalizeTextTrackSpy.mockReset();
    normalizeAudioTrackSpy.mockReset();
    warnOnceSpy.mockReset();
  });

  it("should authorize setting a hideNativeSubtitle option", () => {
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
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
      getLicense: () => { /* noop */},
    };
    const keySystem2 = {
      type: "bar",
      getLicense: () => { /* noop */},
    };
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    expect(parseLoadVideoOptions({
      keySystems: keySystem1,
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          keySystems: {},
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
          keySystems: { type: "test" },
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
          keySystems: { getLicense: () => { /* noop */ } },
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    expect(parseLoadVideoOptions({
      manualBitrateSwitchingMode: "foo",
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      manualBitrateSwitchingMode: "foo",
    });

    expect(parseLoadVideoOptions({
      manualBitrateSwitchingMode: "bar",
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      manualBitrateSwitchingMode: "bar",
    });
  });

  it("should authorize setting a networkConfig", () => {
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
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

  // TODO There is something wrong with the object-assign dependency and jest
  // I did not take time to debug it yet
  xit("should authorize setting a valid startAt option", () => {
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    expect(parseLoadVideoOptions({
      url: "foo",
      transport: "bar",
      startAt: { a: 12 },
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    expect(parseLoadVideoOptions({
      supplementaryImageTracks: supplementaryImageTracks1,
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          supplementaryImageTracks: {},
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
          supplementaryImageTracks: { url: "test" },
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
          supplementaryImageTracks: { mimeType: "test" },
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    expect(parseLoadVideoOptions({
      supplementaryTextTracks: supplementaryTextTracks1,
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      supplementaryTextTracks: [supplementaryTextTracks1],
    });
    expect(parseLoadVideoOptions({
      supplementaryTextTracks: [supplementaryTextTracks1, supplementaryTextTracks2],
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    {
      let err;
      let opt;
      try {
        opt = parseLoadVideoOptions({
          url: "foo",
          transport: "bar",
          supplementaryTextTracks: {},
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
          supplementaryTextTracks: { url: "test", language: "toto" },
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
          supplementaryTextTracks: { mimeType: "test", language: "toto" },
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
          supplementaryTextTracks: { url: "test", mimeType: "toto" },
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    expect(parseLoadVideoOptions({
      transportOptions: { a: 4 },
      url: "foo",
      transport: "bar",
    })).toEqual({
      ...defaultLoadVideoOptions,
      url: "foo",
      transport: "bar",
      transportOptions: { a: 4 },
    });
  });

  it("should authorize setting a valid textTrackMode option", () => {
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    let err;
    let opt;
    try {
      opt = parseLoadVideoOptions({
        textTrackMode: "toto",
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
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
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    let err;
    let opt;
    const textTrackElement = {};
    try {
      opt = parseLoadVideoOptions({
        textTrackMode: "html",
        url: "foo",
        transport: "bar",
        textTrackElement,
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
    const warnSpy = jest.fn();
    jest.mock("../../../log", () => ({ default: { warn: warnSpy } }));
    const parseLoadVideoOptions = require("../option_parsers").parseLoadVideoOptions;
    const textTrackElement = document.createElement("div");

    parseLoadVideoOptions({ textTrackMode: "native", url: "foo", transport: "bar" });
    expect(warnSpy).not.toHaveBeenCalled();

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

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith("API: You have set a textTrackElement " +
      "without being in an \"html\" textTrackMode. It will be ignored.");
  });
});
