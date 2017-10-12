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

type htmlParserFn =
  (texttrack : string, timeOffset : number, language? : string) => any[];
const htmlParsers : { [format : string] : htmlParserFn } = {};

if (__FEATURES__.HTML_SAMI) {
  htmlParsers.sami =
    require("../../../../../parsers/texttracks/sami/html.ts").default;
}

if (__FEATURES__.HTML_TTML) {
  htmlParsers.ttml =
    require("../../../../../parsers/texttracks/ttml/html/index.ts").default;
}

if (__FEATURES__.HTML_SRT) {
  htmlParsers.srt =
    require("../../../../../parsers/texttracks/srt/html.ts").default;
}

if (__FEATURES__.HTML_VTT) {
  htmlParsers.vtt =
    require("../../../../../parsers/texttracks/webvtt/html.ts").default;
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
  type : string,
  data : string,
  timeOffset : number,
  language? : string
) : any[] {
  const parser = htmlParsers[type];

  if (!parser) {
    throw new Error("no parser found for the given text track");
  }
  return parser(data, timeOffset, language);
}
