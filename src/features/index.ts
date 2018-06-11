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

/**
 * File allowing feature-switching.
 * Selects the features to include based on environment variables.
 *
 * Every optional feature is included here.
 * They all should subsequently be accessed in the code through the exported
 * `features` object.
 *
 * The then exported features object will be used dynamically to know which
 * features are activated.
 *
 * This also lazy-feature loading, where this exported object can be updated
 * at runtime, to allow some new features even if the player instance has
 * already have been instanciated.
 */

import { IFeaturesObject } from "./types";

const features : IFeaturesObject = {
  transports: {},
  imageBuffer: null,
  imageParser: null,
  nativeTextTracksBuffer: null,
  nativeTextTracksParsers: {},
  htmlTextTracksBuffer: null,
  htmlTextTracksParsers: {},
  emeManager: null,
  directfile: null,
};

/* tslint:disable no-var-requires */
if (__FEATURES__.EME) {
  features.emeManager = require("../core/eme/index.ts").default;
}
/* tslint:enable no-var-requires */

/* tslint:disable no-var-requires */
if (__FEATURES__.BIF_IMAGES) {
  features.imageBuffer = require("../core/source_buffers/image/index.ts").default;
  features.imageParser = require("../parsers/images/bif.ts").default;
}
/* tslint:enable no-var-requires */

// Feature switching the Native TextTrack implementation
const HAS_NATIVE_MODE =
  __FEATURES__.NATIVE_VTT ||
  __FEATURES__.NATIVE_SAMI ||
  __FEATURES__.NATIVE_TTML ||
  __FEATURES__.NATIVE_SRT;

/* tslint:disable no-var-requires */
if (__FEATURES__.SMOOTH) {
  features.transports.smooth = require("../net/smooth/index.ts").default;
}
if (__FEATURES__.DASH) {
  features.transports.dash = require("../net/dash/index.ts").default;
}
/* tslint:enable no-var-requires */

/* tslint:disable no-var-requires */
if (HAS_NATIVE_MODE) {
  features.nativeTextTracksBuffer =
    require("../core/source_buffers/text/native/index.ts").default;
  if (__FEATURES__.NATIVE_VTT) {
    features.nativeTextTracksParsers.vtt =
      require("../parsers/texttracks/webvtt/native.ts").default;
  }

  if (__FEATURES__.NATIVE_TTML) {
    features.nativeTextTracksParsers.ttml =
      require("../parsers/texttracks/ttml/native/index.ts").default;
  }

  if (__FEATURES__.NATIVE_SAMI) {
    features.nativeTextTracksParsers.sami =
      require("../parsers/texttracks/sami/native.ts").default;
  }

  if (__FEATURES__.NATIVE_SRT) {
    features.nativeTextTracksParsers.srt =
      require("../parsers/texttracks/srt/native.ts").default;
  }
}
/* tslint:enable no-var-requires */

// Feature switching the HTML TextTrack implementation
const HAS_HTML_MODE =
  __FEATURES__.HTML_VTT ||
  __FEATURES__.HTML_SAMI ||
  __FEATURES__.HTML_TTML ||
  __FEATURES__.HTML_SRT;

/* tslint:disable no-var-requires */
if (HAS_HTML_MODE) {
  features.htmlTextTracksBuffer =
    require("../core/source_buffers/text/html/index.ts").default;
  if (__FEATURES__.HTML_SAMI) {
    features.htmlTextTracksParsers.sami =
      require("../parsers/texttracks/sami/html.ts").default;
  }

  if (__FEATURES__.HTML_TTML) {
    features.htmlTextTracksParsers.ttml =
      require("../parsers/texttracks/ttml/html/index.ts").default;
  }

  if (__FEATURES__.HTML_SRT) {
    features.htmlTextTracksParsers.srt =
      require("../parsers/texttracks/srt/html.ts").default;
  }

  if (__FEATURES__.HTML_VTT) {
    features.htmlTextTracksParsers.vtt =
      require("../parsers/texttracks/webvtt/html/index.ts").default;
  }
  /* tslint:enable no-var-requires */
}

/* tslint:disable no-var-requires */
if (__FEATURES__.DIRECTFILE) {
  features.directfile = require("../core/stream/directfile.ts").default;
}
/* tslint:enable no-var-requires */

export default features;
