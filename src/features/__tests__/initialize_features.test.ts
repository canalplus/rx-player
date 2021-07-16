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
/* eslint-disable max-len */

describe("Features - initializeFeaturesObject", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  /* eslint-disable @typescript-eslint/naming-convention */
  const win = window as unknown as {
    __FEATURES__: unknown;
    __RELATIVE_PATH__ : unknown;
  };
  /* eslint-enable @typescript-eslint/naming-convention */

  it("should set no feature if nothing is enabled", () => {
    win.__FEATURES__ = new Proxy({}, {
      get() { return false; },
    });
    const feat = {};
    jest.mock("../features_object", () => ({ default: feat,
                                             __esModule: true as const }));
    const initializeFeaturesObject = require("../initialize_features").default;
    initializeFeaturesObject();
    expect<unknown>(feat).toEqual({});
    delete win.__FEATURES__;
  });

  it("should set the right features when everything is enabled", () => {
    win.__FEATURES__ = new Proxy({}, {
      get() { return true; },
    });
    win.__RELATIVE_PATH__ = {
      EME_MANAGER: "../core/eme/index.ts",
      SMOOTH: "../transports/smooth/index.ts",
      DASH: "../transports/dash/index.ts",
      DASH_JS_PARSER: "../parsers/manifest/dash/js-parser/index.ts",
      LOCAL_MANIFEST: "../transports/local/index.ts",
      METAPLAYLIST: "../transports/metaplaylist/index.ts",
      NATIVE_TEXT_BUFFER: "../core/segment_buffers/implementations/text/native/index.ts",
      NATIVE_VTT: "../parsers/texttracks/webvtt/native/index.ts",
      NATIVE_SRT: "../parsers/texttracks/srt/native.ts",
      NATIVE_TTML: "../parsers/texttracks/ttml/native/index.ts",
      NATIVE_SAMI: "../parsers/texttracks/sami/native.ts",
      HTML_TEXT_BUFFER: "../core/segment_buffers/implementations/text/html/index.ts",
      HTML_VTT: "../parsers/texttracks/webvtt/html/index.ts",
      HTML_SRT: "../parsers/texttracks/srt/html.ts",
      HTML_TTML: "../parsers/texttracks/ttml/html/index.ts",
      HTML_SAMI: "../parsers/texttracks/sami/html.ts",
      DIRECTFILE: "../core/init/initialize_directfile.ts",
      MEDIA_ELEMENT_TRACK_CHOICE_MANAGER: "../core/api/media_element_track_choice_manager.ts",
    };
    const feat = {
      transports: {},
      dashParsers: { js: null, wasm: null },
      nativeTextTracksBuffer: null,
      nativeTextTracksParsers: {},
      htmlTextTracksBuffer: null,
      htmlTextTracksParsers: {},
      emeManager: null,
      directfile: null,
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = require("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      transports: {
        metaplaylist: require("../../transports/metaplaylist/index").default,
        dash: require("../../transports/dash/index").default,
        smooth: require("../../transports/smooth/index").default,
        local: require("../../transports/local/index").default,
      },
      dashParsers: {
        js: require("../../parsers/manifest/dash/js-parser").default,
        wasm: null,
      },
      emeManager: require("../../core/eme/index").default,
      directfile: {
        initDirectFile: require("../../core/init/initialize_directfile").default,
        mediaElementTrackChoiceManager:
          require("../../core/api/media_element_track_choice_manager").default,
      },
      nativeTextTracksBuffer: require("../../core/segment_buffers/implementations/text/native/index")
        .default,
      nativeTextTracksParsers: {
        vtt: require("../../parsers/texttracks/webvtt/native/index").default,
        ttml: require("../../parsers/texttracks/ttml/native/index").default,
        sami: require("../../parsers/texttracks/sami/native").default,
        srt: require("../../parsers/texttracks/srt/native").default,
      },
      htmlTextTracksBuffer: require("../../core/segment_buffers/implementations/text/html/index")
        .default,
      htmlTextTracksParsers: {
        vtt: require("../../parsers/texttracks/webvtt/html/index").default,
        ttml: require("../../parsers/texttracks/ttml/html/index").default,
        sami: require("../../parsers/texttracks/sami/html").default,
        srt: require("../../parsers/texttracks/srt/html").default,
      },
    });

    delete win.__FEATURES__;
    delete win.__RELATIVE_PATH__;
  });

  it("should add the html text buffer if the html vtt parser is added", () => {
    win.__FEATURES__ = new Proxy({}, {
      get(_target, prop) {
        return prop === "HTML_VTT";
      },
    });
    win.__RELATIVE_PATH__ = {
      HTML_TEXT_BUFFER: "../core/segment_buffers/implementations/text/html/index.ts",
      HTML_VTT: "../parsers/texttracks/webvtt/html/index.ts",
    };
    const feat = {
      htmlTextTracksBuffer: null,
      htmlTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = require("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      htmlTextTracksBuffer: require("../../core/segment_buffers/implementations/text/html/index")
        .default,
      htmlTextTracksParsers: {
        vtt: require("../../parsers/texttracks/webvtt/html/index").default,
      },
    });

    delete win.__FEATURES__;
    delete win.__RELATIVE_PATH__;
  });

  it("should add the html text buffer if the html sami parser is added", () => {
    win.__FEATURES__ = new Proxy({}, {
      get(_target, prop) {
        return prop === "HTML_SAMI";
      },
    });
    win.__RELATIVE_PATH__ = {
      HTML_TEXT_BUFFER: "../core/segment_buffers/implementations/text/html/index.ts",
      HTML_SAMI: "../parsers/texttracks/sami/html",
    };
    const feat = {
      htmlTextTracksBuffer: null,
      htmlTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = require("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      htmlTextTracksBuffer: require("../../core/segment_buffers/implementations/text/html/index")
        .default,
      htmlTextTracksParsers: {
        sami: require("../../parsers/texttracks/sami/html").default,
      },
    });

    delete win.__FEATURES__;
    delete win.__RELATIVE_PATH__;
  });

  it("should add the html text buffer if the html ttml parser is added", () => {
    win.__FEATURES__ = new Proxy({}, {
      get(_target, prop) {
        return prop === "HTML_TTML";
      },
    });
    win.__RELATIVE_PATH__ = {
      HTML_TEXT_BUFFER: "../core/segment_buffers/implementations/text/html/index.ts",
      HTML_TTML: "../parsers/texttracks/ttml/html/index",
    };
    const feat = {
      htmlTextTracksBuffer: null,
      htmlTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = require("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      htmlTextTracksBuffer: require("../../core/segment_buffers/implementations/text/html/index")
        .default,
      htmlTextTracksParsers: {
        ttml: require("../../parsers/texttracks/ttml/html/index").default,
      },
    });

    delete win.__FEATURES__;
    delete win.__RELATIVE_PATH__;
  });

  it("should add the html text buffer if the html srt parser is added", () => {
    win.__FEATURES__ = new Proxy({}, {
      get(_target, prop) {
        return prop === "HTML_SRT";
      },
    });
    win.__RELATIVE_PATH__ = {
      HTML_TEXT_BUFFER: "../core/segment_buffers/implementations/text/html/index.ts",
      HTML_SRT: "../parsers/texttracks/srt/html",
    };
    const feat = {
      htmlTextTracksBuffer: null,
      htmlTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = require("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      htmlTextTracksBuffer: require("../../core/segment_buffers/implementations/text/html/index")
        .default,
      htmlTextTracksParsers: {
        srt: require("../../parsers/texttracks/srt/html").default,
      },
    });

    delete win.__FEATURES__;
    delete win.__RELATIVE_PATH__;
  });

  it("should add the native text buffer if the native vtt parser is added", () => {
    win.__FEATURES__ = new Proxy({}, {
      get(_target, prop) {
        return prop === "NATIVE_VTT";
      },
    });
    win.__RELATIVE_PATH__ = {
      NATIVE_TEXT_BUFFER: "../core/segment_buffers/implementations/text/native/index",
      NATIVE_VTT: "../parsers/texttracks/webvtt/native/index",
    };
    const feat = {
      nativeTextTracksBuffer: null,
      nativeTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = require("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      nativeTextTracksBuffer: require("../../core/segment_buffers/implementations/text/native/index")
        .default,
      nativeTextTracksParsers: {
        vtt: require("../../parsers/texttracks/webvtt/native/index").default,
      },
    });

    delete win.__FEATURES__;
    delete win.__RELATIVE_PATH__;
  });

  it("should add the native text buffer if the native sami parser is added", () => {
    win.__FEATURES__ = new Proxy({}, {
      get(_target, prop) {
        return prop === "NATIVE_SAMI";
      },
    });
    win.__RELATIVE_PATH__ = {
      NATIVE_TEXT_BUFFER: "../core/segment_buffers/implementations/text/native/index.ts",
      NATIVE_SAMI: "../parsers/texttracks/sami/native",
    };
    const feat = {
      nativeTextTracksBuffer: null,
      nativeTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = require("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      nativeTextTracksBuffer: require("../../core/segment_buffers/implementations/text/native/index")
        .default,
      nativeTextTracksParsers: {
        sami: require("../../parsers/texttracks/sami/native").default,
      },
    });

    delete win.__FEATURES__;
    delete win.__RELATIVE_PATH__;
  });

  it("should add the native text buffer if the native ttml parser is added", () => {
    win.__FEATURES__ = new Proxy({}, {
      get(_target, prop) {
        return prop === "NATIVE_TTML";
      },
    });
    win.__RELATIVE_PATH__ = {
      NATIVE_TEXT_BUFFER: "../core/segment_buffers/implementations/text/native/index.ts",
      NATIVE_TTML: "../parsers/texttracks/ttml/native/index",
    };
    const feat = {
      nativeTextTracksBuffer: null,
      nativeTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = require("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      nativeTextTracksBuffer: require("../../core/segment_buffers/implementations/text/native/index")
        .default,
      nativeTextTracksParsers: {
        ttml: require("../../parsers/texttracks/ttml/native/index").default,
      },
    });

    delete win.__FEATURES__;
    delete win.__RELATIVE_PATH__;
  });

  it("should add the native text buffer if the native srt parser is added", () => {
    win.__FEATURES__ = new Proxy({}, {
      get(_target, prop) {
        return prop === "NATIVE_SRT";
      },
    });
    win.__RELATIVE_PATH__ = {
      NATIVE_TEXT_BUFFER: "../core/segment_buffers/implementations/text/native/index.ts",
      NATIVE_SRT: "../parsers/texttracks/srt/native",
    };
    const feat = {
      nativeTextTracksBuffer: null,
      nativeTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = require("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      nativeTextTracksBuffer: require("../../core/segment_buffers/implementations/text/native/index")
        .default,
      nativeTextTracksParsers: {
        srt: require("../../parsers/texttracks/srt/native").default,
      },
    });

    delete win.__FEATURES__;
    delete win.__RELATIVE_PATH__;
  });
});
