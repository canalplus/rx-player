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

import ISO_MAP_1_TO_3 from "./ISO_639-1_to_ISO_639-3.js";
import ISO_MAP_2_TO_3 from "./ISO_639-2_to_ISO_639-3.js";

/**
 * Normalize text track from a user given input into an object
 * with three properties:
 *   - language {string}: The language the user gave us
 *   - normalized {string}: An attempt to normalize the language into an
 *     ISO 639-3 code
 *   - closedCaption {Boolean}: Whether the track is a closed caption track
 * @param {Object|string} _language
 * @returns {Object|null|undefined}
 */
function normalizeTextTrack(_language) {
  if (_language != null) {
    let language, closedCaption;
    if (typeof _language === "string") {
      language = _language;
      closedCaption = false;
    } else {
      language = _language.language;
      closedCaption = !!_language.closedCaption;
    }

    return {
      language,
      closedCaption,
      normalized: normalize(language),
    };
  }
  return _language;
}

/**
 * Normalize audio track from a user given input into an object
 * with three properties:
 *   - language {string}: The language the user gave us
 *   - normalized {string}: An attempt to normalize the language into an
 *     ISO 639-3 code
 *   - audioDescription {Boolean}: Whether the track is a closed caption track
 * @param {Object|string} _language
 * @returns {Object|null|undefined}
 */
function normalizeAudioTrack(_language) {
  if (_language != null) {
    let language, audioDescription;
    if (typeof _language === "string") {
      language = _language;
      audioDescription = false;
    } else {
      language = _language.language;
      audioDescription = !!_language.audioDescription;
    }

    return {
      language,
      audioDescription,
      normalized: normalize(language),
    };
  }
  return _language;
}

/**
 * Normalize language given.
 * Basically:
 *   - converts it to lowercase.
 *   - normalize "base" (what is before the possible first "-") to an ISO639-3
 *     compatible string.
 * @param {string} _language
 * @returns {string}
 */
function normalize(_language) {
  if (_language == null || _language === "") {
    return "";
  }
  const fields = (""+_language).toLowerCase().split("-");
  const base = fields[0];
  const normalizedBase = normalizeBase(base);
  if (normalizedBase) {
    fields[0] = normalizedBase;
  }
  return fields.join("-");
}

/**
 * Normalize language into an ISO639-3 format.
 * @param {string} base
 * @returns {string}
 */
function normalizeBase(base) {
  let result;
  if (base.length === 2) {
    result = ISO_MAP_1_TO_3[base];
  } else if (base.length === 3) {
    result = ISO_MAP_2_TO_3[base];
  }
  return result || base;
}

export {
  normalize,
  normalizeAudioTrack,
  normalizeTextTrack,
};
