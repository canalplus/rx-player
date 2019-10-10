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

import isNonEmptyString from "../is_non_empty_string";
import isNullOrUndefined from "../is_null_or_undefined";
import ISO_MAP_1_TO_3 from "./ISO_639-1_to_ISO_639-3";
import ISO_MAP_2_TO_3 from "./ISO_639-2_to_ISO_639-3";

interface IMinimalAudioTrackObject { language: string;
                                     isDub? : boolean;
                                     audioDescription?: boolean; }

interface IMinimalTextTrackObject { language: string;
                                    closedCaption?: boolean; }

interface INormalizedAudioTrackObject
          extends IMinimalAudioTrackObject { normalized: string;
                                             isDub? : boolean;
                                             audioDescription : boolean; }

interface INormalizedTextTrackObject
          extends IMinimalTextTrackObject { normalized: string;
                                            closedCaption : boolean; }
/**
 * Normalize language given.
 * Basically:
 *   - converts it to lowercase.
 *   - normalize "base" (what is before the possible first "-") to an ISO639-3
 *     compatible string.
 * @param {string} _language
 * @returns {string}
 */
function normalizeLanguage(_language : string) : string {
  if (isNullOrUndefined(_language) || _language === "") {
    return "";
  }
  const fields = ("" + _language).toLowerCase().split("-");
  const base = fields[0];
  const normalizedBase = normalizeBase(base);
  if (isNonEmptyString(normalizedBase)) {
    return normalizedBase;
  }
  return _language;
}

/**
 * Normalize language into an ISO639-3 format.
 * Returns undefined if it failed to do so
 * @param {string} base
 * @returns {string}
 */
function normalizeBase(base : string) : string|undefined {
  let result;
  switch (base.length) {
    case 2:
      result = ISO_MAP_1_TO_3[base];
      break;
    case 3:
      result = ISO_MAP_2_TO_3[base];
      break;
  }
  return result;
}

/**
 * Normalize text track from a user given input into an object
 * with three properties:
 *   - language {string}: The language the user gave us
 *   - normalized {string}: An attempt to normalize the language into an
 *     ISO 639-3 code
 *   - closedCaption {Boolean}: Whether the track is a closed caption track
 * @param {Object|string|null|undefined} _language
 * @returns {Object|null|undefined}
 */
function normalizeTextTrack(
  _language : string|IMinimalTextTrackObject|null|undefined
) : INormalizedTextTrackObject|null|undefined {
  if (!isNullOrUndefined(_language)) {
    let language;
    let closedCaption = false;
    if (typeof _language === "string") {
      language = _language;
    } else {
      language = _language.language;
      if (_language.closedCaption === true) {
        closedCaption = true;
      }
    }

    return { language,
             closedCaption,
             normalized: normalizeLanguage(language) };
  }

  return _language;
}

/**
 * Normalize audio track from a user given input into an object
 * with the following properties:
 *   - language {string}: The language the user gave us
 *   - normalized {string}: An attempt to normalize the language into an
 *     ISO 639-3 code
 *   - audioDescription {Boolean}: Whether the track is a closed caption track
 *   - isDub {Boolean|undefined}: if true, this is a dub.
 * @param {Object|string|null|undefined} _language
 * @returns {Object|null|undefined}
 */
function normalizeAudioTrack(
  _language : string|IMinimalAudioTrackObject|null|undefined
) : INormalizedAudioTrackObject|null|undefined {
  if (isNullOrUndefined(_language)) {
    return _language;
  }
  if (typeof _language === "string") {
    return { language: _language,
             audioDescription: false,
             normalized: normalizeLanguage(_language) };
  }
  const normalized : INormalizedAudioTrackObject = {
    language: _language.language,
    audioDescription: _language.audioDescription === true,
    normalized: normalizeLanguage(normalizeLanguage(_language.language)),
  };
  if (_language.isDub === true) {
    normalized.isDub = true;
  }
  return normalized;
}

export default normalizeLanguage;
export {
  normalizeAudioTrack,
  normalizeTextTrack,
  INormalizedTextTrackObject,
  INormalizedAudioTrackObject,
};
