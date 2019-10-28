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

// XML-Schema
/* tslint:disable:max-line-length */
// <http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd>
/* tslint:enable:max-line-length */

import isNonEmptyString from "../../../../utils/is_non_empty_string";

export interface IScheme { schemeIdUri? : string;
                           value? : string; }

const iso8601Duration =
  /^P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T?(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/;
const rangeRe = /([0-9]+)-([0-9]+)/;

/**
 * Parse MPD boolean attributes.
 * @param {string} str
 * @returns {Boolean}
 */
function parseBoolean(str : string) : boolean {
  return str === "true";
}

/**
 * Parse some MPD attributes.
 * @param {string} str
 * @returns {Boolean|Number}
 */
function parseIntOrBoolean(str : string) : boolean|number {
  if (str === "true") {
    return true;
  }
  if (str === "false") {
    return false;
  }
  return parseInt(str, 10);
}

/**
 * Parse MPD date attributes.
 * @param {string} str
 * @returns {Date}
 */
function parseDateTime(str : string) : number {
  return new Date(Date.parse(str)).getTime() / 1000;
}

/**
 * Parse MPD ISO8601 duration attributes into seconds.
 * @param {string} date
 * @returns {Number}
 */
function parseDuration(date : string) : number {
  if (!isNonEmptyString(date)) {
    return 0;
  }

  const match = iso8601Duration.exec(date) as RegExpExecArray;
  if (match == null) {
    throw new Error(`${date} is not a valid ISO8601 duration`);
  }

  return (parseFloat(isNonEmptyString(match[2]) ? match[2] :
                                                  "0") * 365 * 24 * 60 * 60 +
          parseFloat(isNonEmptyString(match[4]) ? match[4] :
                                                  "0") * 30 * 24 * 60 * 60 +
          parseFloat(isNonEmptyString(match[6]) ? match[6] :
                                                  "0") * 24 * 60 * 60 +
          parseFloat(isNonEmptyString(match[8]) ? match[8] :
                                                  "0") * 60 * 60 +
          parseFloat(isNonEmptyString(match[10]) ? match[10] :
                                                   "0") * 60 +
          parseFloat(isNonEmptyString(match[12]) ? match[12] :
                                                   "0"));
}

/**
 * Parse MPD byterange attributes into arrays of two elements: the start and
 * the end.
 * @param {string} str
 * @returns {Array.<Number>}
 */
function parseByteRange(str : string) : [number, number]|null {
  const match = rangeRe.exec(str);
  if (match == null) {
    return null;
  } else {
    return [+match[1], +match[2]];
  }
}

/**
 * @param {Element} root
 * @returns {Object}
 */
function parseScheme(root: Element) : IScheme {
  let schemeIdUri : string|undefined;
  let value : string|undefined;
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {
      case "schemeIdUri":
        schemeIdUri = attribute.value;
        break;
      case "value":
        value = attribute.value;
        break;
    }
  }

  return { schemeIdUri,
           value };
}

export {
  parseBoolean,
  parseByteRange,
  parseDateTime,
  parseDuration,
  parseIntOrBoolean,
  parseScheme,
};
