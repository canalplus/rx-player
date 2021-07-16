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
  };
  /* eslint-enable @typescript-eslint/naming-convention */

  it("should set no feature if nothing is enabled", () => {
    win.__FEATURES__ = {
      IS_DISABLED: 0,
      IS_ENABLED: 1,

      DASH: 0,
      DIRECTFILE: 0,
      EME: 0,
      HTML_SAMI: 0,
      HTML_SRT: 0,
      HTML_TTML: 0,
      HTML_VTT: 0,
      LOCAL_MANIFEST: 0,
      METAPLAYLIST: 0,
      NATIVE_SAMI: 0,
      NATIVE_SRT: 0,
      NATIVE_TTML: 0,
      NATIVE_VTT: 0,
      SMOOTH: 0,
    };
    const feat = {};
    jest.mock("../features_object", () => ({ default: feat,
                                             __esModule: true as const }));
    const initializeFeaturesObject = jest.requireActual("../initialize_features").default;
    initializeFeaturesObject();
    expect<unknown>(feat).toEqual({});
    delete win.__FEATURES__;
  });

  it("should set the right features when everything is enabled", () => {
    win.__FEATURES__ = {
      IS_DISABLED: 0,
      IS_ENABLED: 1,

      DASH: 1,
      DIRECTFILE: 1,
      EME: 1,
      HTML_SAMI: 1,
      HTML_SRT: 1,
      HTML_TTML: 1,
      HTML_VTT: 1,
      LOCAL_MANIFEST: 1,
      METAPLAYLIST: 1,
      NATIVE_SAMI: 1,
      NATIVE_SRT: 1,
      NATIVE_TTML: 1,
      NATIVE_VTT: 1,
      SMOOTH: 1,
    };
    const feat = {
      transports: {},
      dashParsers: { js: null, wasm: null },
      nativeTextTracksBuffer: null,
      nativeTextTracksParsers: {},
      htmlTextTracksBuffer: null,
      htmlTextTracksParsers: {},
      ContentDecryptor: null,
      directfile: null,
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = jest.requireActual("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      transports: {
        metaplaylist: jest.requireActual("../../transports/metaplaylist/index").default,
        dash: jest.requireActual("../../transports/dash/index").default,
        smooth: jest.requireActual("../../transports/smooth/index").default,
        local: jest.requireActual("../../transports/local/index").default,
      },
      dashParsers: {
        js: jest.requireActual("../../parsers/manifest/dash/js-parser").default,
        wasm: null,
      },
      ContentDecryptor: jest.requireActual("../../core/decrypt/index").default,
      directfile: {
        initDirectFile: jest.requireActual("../../core/init/initialize_directfile").default,
        mediaElementTrackChoiceManager:
          jest.requireActual("../../core/api/media_element_track_choice_manager").default,
      },
      nativeTextTracksBuffer: jest.requireActual("../../core/segment_buffers/implementations/text/native/index")
        .default,
      nativeTextTracksParsers: {
        vtt: jest.requireActual("../../parsers/texttracks/webvtt/native/index").default,
        ttml: jest.requireActual("../../parsers/texttracks/ttml/native/index").default,
        sami: jest.requireActual("../../parsers/texttracks/sami/native").default,
        srt: jest.requireActual("../../parsers/texttracks/srt/native").default,
      },
      htmlTextTracksBuffer: jest.requireActual("../../core/segment_buffers/implementations/text/html/index")
        .default,
      htmlTextTracksParsers: {
        vtt: jest.requireActual("../../parsers/texttracks/webvtt/html/index").default,
        ttml: jest.requireActual("../../parsers/texttracks/ttml/html/index").default,
        sami: jest.requireActual("../../parsers/texttracks/sami/html").default,
        srt: jest.requireActual("../../parsers/texttracks/srt/html").default,
      },
    });

    delete win.__FEATURES__;
  });

  it("should add the html text buffer if the html vtt parser is added", () => {
    win.__FEATURES__ = {
      IS_DISABLED: 0,
      IS_ENABLED: 1,

      DASH: 0,
      DIRECTFILE: 0,
      EME: 0,
      HTML_SAMI: 0,
      HTML_SRT: 0,
      HTML_TTML: 0,
      HTML_VTT: 1,
      LOCAL_MANIFEST: 0,
      METAPLAYLIST: 0,
      NATIVE_SAMI: 0,
      NATIVE_SRT: 0,
      NATIVE_TTML: 0,
      NATIVE_VTT: 0,
      SMOOTH: 0,
    };
    const feat = {
      htmlTextTracksBuffer: null,
      htmlTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = jest.requireActual("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      htmlTextTracksBuffer: jest.requireActual("../../core/segment_buffers/implementations/text/html/index")
        .default,
      htmlTextTracksParsers: {
        vtt: jest.requireActual("../../parsers/texttracks/webvtt/html/index").default,
      },
    });

    delete win.__FEATURES__;
  });

  it("should add the html text buffer if the html sami parser is added", () => {
    win.__FEATURES__ = {
      IS_DISABLED: 0,
      IS_ENABLED: 1,

      DASH: 0,
      DIRECTFILE: 0,
      EME: 0,
      HTML_SAMI: 1,
      HTML_SRT: 0,
      HTML_TTML: 0,
      HTML_VTT: 0,
      LOCAL_MANIFEST: 0,
      METAPLAYLIST: 0,
      NATIVE_SAMI: 0,
      NATIVE_SRT: 0,
      NATIVE_TTML: 0,
      NATIVE_VTT: 0,
      SMOOTH: 0,
    };
    const feat = {
      htmlTextTracksBuffer: null,
      htmlTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = jest.requireActual("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      htmlTextTracksBuffer: jest.requireActual("../../core/segment_buffers/implementations/text/html/index")
        .default,
      htmlTextTracksParsers: {
        sami: jest.requireActual("../../parsers/texttracks/sami/html").default,
      },
    });

    delete win.__FEATURES__;
  });

  it("should add the html text buffer if the html ttml parser is added", () => {
    win.__FEATURES__ = {
      IS_DISABLED: 0,
      IS_ENABLED: 1,

      DASH: 0,
      DIRECTFILE: 0,
      EME: 0,
      HTML_SAMI: 0,
      HTML_SRT: 0,
      HTML_TTML: 1,
      HTML_VTT: 0,
      LOCAL_MANIFEST: 0,
      METAPLAYLIST: 0,
      NATIVE_SAMI: 0,
      NATIVE_SRT: 0,
      NATIVE_TTML: 0,
      NATIVE_VTT: 0,
      SMOOTH: 0,
    };
    const feat = {
      htmlTextTracksBuffer: null,
      htmlTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = jest.requireActual("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      htmlTextTracksBuffer: jest.requireActual("../../core/segment_buffers/implementations/text/html/index")
        .default,
      htmlTextTracksParsers: {
        ttml: jest.requireActual("../../parsers/texttracks/ttml/html/index").default,
      },
    });

    delete win.__FEATURES__;
  });

  it("should add the html text buffer if the html srt parser is added", () => {
    win.__FEATURES__ = {
      IS_DISABLED: 0,
      IS_ENABLED: 1,

      DASH: 0,
      DIRECTFILE: 0,
      EME: 0,
      HTML_SAMI: 0,
      HTML_SRT: 1,
      HTML_TTML: 0,
      HTML_VTT: 0,
      LOCAL_MANIFEST: 0,
      METAPLAYLIST: 0,
      NATIVE_SAMI: 0,
      NATIVE_SRT: 0,
      NATIVE_TTML: 0,
      NATIVE_VTT: 0,
      SMOOTH: 0,
    };
    const feat = {
      htmlTextTracksBuffer: null,
      htmlTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = jest.requireActual("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      htmlTextTracksBuffer: jest.requireActual("../../core/segment_buffers/implementations/text/html/index")
        .default,
      htmlTextTracksParsers: {
        srt: jest.requireActual("../../parsers/texttracks/srt/html").default,
      },
    });

    delete win.__FEATURES__;
  });

  it("should add the native text buffer if the native vtt parser is added", () => {
    win.__FEATURES__ = {
      IS_DISABLED: 0,
      IS_ENABLED: 1,

      DASH: 0,
      DIRECTFILE: 0,
      EME: 0,
      HTML_SAMI: 0,
      HTML_SRT: 0,
      HTML_TTML: 0,
      HTML_VTT: 0,
      LOCAL_MANIFEST: 0,
      METAPLAYLIST: 0,
      NATIVE_SAMI: 0,
      NATIVE_SRT: 0,
      NATIVE_TTML: 0,
      NATIVE_VTT: 1,
      SMOOTH: 0,
    };
    const feat = {
      nativeTextTracksBuffer: null,
      nativeTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = jest.requireActual("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      nativeTextTracksBuffer: jest.requireActual("../../core/segment_buffers/implementations/text/native/index")
        .default,
      nativeTextTracksParsers: {
        vtt: jest.requireActual("../../parsers/texttracks/webvtt/native/index").default,
      },
    });

    delete win.__FEATURES__;
  });

  it("should add the native text buffer if the native sami parser is added", () => {
    win.__FEATURES__ = {
      IS_DISABLED: 0,
      IS_ENABLED: 1,

      DASH: 0,
      DIRECTFILE: 0,
      EME: 0,
      HTML_SAMI: 0,
      HTML_SRT: 0,
      HTML_TTML: 0,
      HTML_VTT: 0,
      LOCAL_MANIFEST: 0,
      METAPLAYLIST: 0,
      NATIVE_SAMI: 1,
      NATIVE_SRT: 0,
      NATIVE_TTML: 0,
      NATIVE_VTT: 0,
      SMOOTH: 0,
    };
    const feat = {
      nativeTextTracksBuffer: null,
      nativeTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = jest.requireActual("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      nativeTextTracksBuffer: jest.requireActual("../../core/segment_buffers/implementations/text/native/index")
        .default,
      nativeTextTracksParsers: {
        sami: jest.requireActual("../../parsers/texttracks/sami/native").default,
      },
    });

    delete win.__FEATURES__;
  });

  it("should add the native text buffer if the native ttml parser is added", () => {
    win.__FEATURES__ = {
      IS_DISABLED: 0,
      IS_ENABLED: 1,

      DASH: 0,
      DIRECTFILE: 0,
      EME: 0,
      HTML_SAMI: 0,
      HTML_SRT: 0,
      HTML_TTML: 0,
      HTML_VTT: 0,
      LOCAL_MANIFEST: 0,
      METAPLAYLIST: 0,
      NATIVE_SAMI: 0,
      NATIVE_SRT: 0,
      NATIVE_TTML: 1,
      NATIVE_VTT: 0,
      SMOOTH: 0,
    };
    const feat = {
      nativeTextTracksBuffer: null,
      nativeTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = jest.requireActual("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      nativeTextTracksBuffer: jest.requireActual("../../core/segment_buffers/implementations/text/native/index")
        .default,
      nativeTextTracksParsers: {
        ttml: jest.requireActual("../../parsers/texttracks/ttml/native/index").default,
      },
    });

    delete win.__FEATURES__;
  });

  it("should add the native text buffer if the native srt parser is added", () => {
    win.__FEATURES__ = {
      IS_DISABLED: 0,
      IS_ENABLED: 1,

      DASH: 0,
      DIRECTFILE: 0,
      EME: 0,
      HTML_SAMI: 0,
      HTML_SRT: 0,
      HTML_TTML: 0,
      HTML_VTT: 0,
      LOCAL_MANIFEST: 0,
      METAPLAYLIST: 0,
      NATIVE_SAMI: 0,
      NATIVE_SRT: 1,
      NATIVE_TTML: 0,
      NATIVE_VTT: 0,
      SMOOTH: 0,
    };
    const feat = {
      nativeTextTracksBuffer: null,
      nativeTextTracksParsers: {},
    };
    jest.mock("../features_object", () => ({
      __esModule: true as const,
      default: feat,
    }));
    const initializeFeaturesObject = jest.requireActual("../initialize_features").default;
    initializeFeaturesObject();
    expect(feat).toEqual({
      nativeTextTracksBuffer: jest.requireActual("../../core/segment_buffers/implementations/text/native/index")
        .default,
      nativeTextTracksParsers: {
        srt: jest.requireActual("../../parsers/texttracks/srt/native").default,
      },
    });

    delete win.__FEATURES__;
  });
});
