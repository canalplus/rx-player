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

const nativeParsers = {};

if (__FEATURES__.NATIVE_TTML) {
  nativeParsers.ttml =
    require("../../../../../parsers/texttracks/ttml/native/index.js").default;
}

if (__FEATURES__.NATIVE_SAMI) {
  nativeParsers.sami =
    require("../../../../../parsers/texttracks/sami/native.js").default;
  nativeParsers.smil = nativeParsers.sami;
}

/**
 * @param {string} type
 * @param {string} data
 * @param {string} [language]
 * @returns {Array.<VTTCue>}
 * @throws Error - Throw if no parser is found for the given type
 */
export default function parseTextTrackToCues(type, data, language) {
  const parser = nativeParsers[type];

  if (!parser) {
    throw new Error("no parser found for the given text track");
  }

  return parser(data, language);
}
