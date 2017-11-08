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

const htmlParsers = {};

// TODO manage webvtt

if (__FEATURES__.HTML_SAMI) {
  htmlParsers.sami =
    require("../../../../../parsers/texttracks/sami/html.js").default;
}

if (__FEATURES__.HTML_TTML) {
  htmlParsers.ttml =
    require("../../../../../parsers/texttracks/ttml/html/index.js").default;
}

if (__FEATURES__.HTML_SRT) {
  htmlParsers.srt =
    require("../../../../../parsers/texttracks/srt/html.js").default;
}

if (__FEATURES__.HTML_VTT) {
  htmlParsers.vtt =
    require("../../../../../parsers/texttracks/webvtt/html.js").default;
}

/**
 * @param {string} type
 * @param {string} data
 * @param {Number} timeOffset
 * @param {string} [language]
 * @returns {Array.<Object>}
 * @throws Error - Throw if no parser is found for the given type
 */
export default function parseTextTrackToElements(
  type,
  data,
  timeOffset,
  language
) {
  const parser = htmlParsers[type];

  if (!parser) {
    throw new Error("no parser found for the given text track");
  }
  return parser(data, timeOffset, language);
}
