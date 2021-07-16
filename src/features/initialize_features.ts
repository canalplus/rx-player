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

import features from "./features_object";

/**
 * Selects the features to include based on environment variables.
 *
 * @param {Object} features
 */
export default function initializeFeaturesObject() : void {
  if (__FEATURES__.EME) {
    features.emeManager = require(__RELATIVE_PATH__.EME_MANAGER).default;
  }

  // Feature switching the Native TextTrack implementation
  const HAS_NATIVE_MODE = __FEATURES__.NATIVE_VTT ||
                          __FEATURES__.NATIVE_SAMI ||
                          __FEATURES__.NATIVE_TTML ||
                          __FEATURES__.NATIVE_SRT;

  if (__FEATURES__.SMOOTH) {
    features.transports.smooth = require(__RELATIVE_PATH__.SMOOTH).default;
  }
  if (__FEATURES__.DASH) {
    features.transports.dash = require(__RELATIVE_PATH__.DASH).default;
    features.dashParsers.js = require(__RELATIVE_PATH__.DASH_JS_PARSER).default;
  }
  if (__FEATURES__.LOCAL_MANIFEST) {
    features.transports.local = require(__RELATIVE_PATH__.LOCAL_MANIFEST).default;
  }
  if (__FEATURES__.METAPLAYLIST) {
    features.transports.metaplaylist = require(__RELATIVE_PATH__.METAPLAYLIST).default;
  }

  if (HAS_NATIVE_MODE) {
    features.nativeTextTracksBuffer =
      require(__RELATIVE_PATH__.NATIVE_TEXT_BUFFER).default;
    if (__FEATURES__.NATIVE_VTT) {
      features.nativeTextTracksParsers.vtt =
        require(__RELATIVE_PATH__.NATIVE_VTT).default;
    }

    if (__FEATURES__.NATIVE_TTML) {
      features.nativeTextTracksParsers.ttml =
        require(__RELATIVE_PATH__.NATIVE_TTML).default;
    }

    if (__FEATURES__.NATIVE_SAMI) {
      features.nativeTextTracksParsers.sami =
        require(__RELATIVE_PATH__.NATIVE_SAMI).default;
    }

    if (__FEATURES__.NATIVE_SRT) {
      features.nativeTextTracksParsers.srt =
        require(__RELATIVE_PATH__.NATIVE_SRT).default;
    }
  }

  // Feature switching the HTML TextTrack implementation
  const HAS_HTML_MODE = __FEATURES__.HTML_VTT ||
                        __FEATURES__.HTML_SAMI ||
                        __FEATURES__.HTML_TTML ||
                        __FEATURES__.HTML_SRT;

  if (HAS_HTML_MODE) {
    features.htmlTextTracksBuffer =
      require(__RELATIVE_PATH__.HTML_TEXT_BUFFER).default;
    if (__FEATURES__.HTML_SAMI) {
      features.htmlTextTracksParsers.sami =
        require(__RELATIVE_PATH__.HTML_SAMI).default;
    }

    if (__FEATURES__.HTML_TTML) {
      features.htmlTextTracksParsers.ttml =
        require(__RELATIVE_PATH__.HTML_TTML).default;
    }

    if (__FEATURES__.HTML_SRT) {
      features.htmlTextTracksParsers.srt =
        require(__RELATIVE_PATH__.HTML_SRT).default;
    }

    if (__FEATURES__.HTML_VTT) {
      features.htmlTextTracksParsers.vtt =
        require(__RELATIVE_PATH__.HTML_VTT).default;
    }
  }

  if (__FEATURES__.DIRECTFILE) {
    const initDirectFile = require(__RELATIVE_PATH__.DIRECTFILE).default;
    const mediaElementTrackChoiceManager =
      require(__RELATIVE_PATH__.MEDIA_ELEMENT_TRACK_CHOICE_MANAGER).default;
    features.directfile = { initDirectFile,
                            mediaElementTrackChoiceManager };
  }
}
