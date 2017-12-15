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

import assert from "../../../utils/assert";

export interface IScheme {
  schemeIdUri? : string;
  value? : string;
}

export interface IAccessibility {
  schemeIdUri?: string;
  value?: string|number;
}

export interface IRole {
  schemeIdUri?: string;
  value?: string;
}

const iso8601Duration =
  /^P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T?(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/;
const rangeRe = /([0-9]+)-([0-9]+)/;
const frameRateRe = /([0-9]+)(\/([0-9]+))?/;

/**
 * Parse MPD string attributes.
 * @param {string} str
 * @returns {string} - the same string
 */
function parseString(str : string) : string {
  return str;
}

/**
 * Parse MPD boolean attributes.
 * @param {string}
 * @returns {Boolean}
 */
function parseBoolean(str : string) : boolean {
  return str === "true";
}

/**
 * Parse some MPD attributes.
 * @param {string}
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
 * @param {string}
 * @returns {Date}
 */
function parseDateTime(str : string) : number {
  return new Date(Date.parse(str)).getTime() / 1000;
}

/**
 * Parse MPD ISO8601 duration attributes into seconds.
 * @param {string}
 * @returns {Number}
 */
function parseDuration(date : string) : number {
  if (!date) {
    return 0;
  }

  const match = iso8601Duration.exec(date) as RegExpExecArray;
  assert(match, `${date} is not a valid ISO8601 duration`);

  return (
    parseFloat(match[2]  || "0") * 365 * 24 * 60 * 60 +
    parseFloat(match[4]  || "0") * 30 * 24 * 60 * 60 + // not precise +
    parseFloat(match[6]  || "0") * 24 * 60 * 60 +
    parseFloat(match[8]  || "0") * 60 * 60 +
    parseFloat(match[10] || "0") * 60 +
    parseFloat(match[12] || "0")
  );
}

/**
 * Parse MPD frame rate attributes.
 * -1 if the frameRate could not be parsed,
 * @param {string} str
 * @returns {Number}
 */
function parseFrameRate(str : string) : number {
  const match = frameRateRe.exec(str);
  if (!match) {
    return -1;
  }

  const nom = parseInt(match[1], 10) || 0;
  const den = parseInt(match[2], 10) || 0;
  return den > 0
    ? nom / den
    : nom;
}

/**
 * Parse MPD ratio attributes.
 * @param {string} str
 * @returns {string}
 */
function parseRatio(str : string) : string {
  return str;
}

/**
 * Parse MPD byterange attributes into arrays of two elements: the start and
 * the end.
 * @param {string} str
 * @returns {Array.<Number>}
 */
function parseByteRange(str : string) : [number, number]|null {
  const match = rangeRe.exec(str);
  if (!match) {
    return null;
  } else {
    return [+match[1], +match[2]];
  }
}

/**
 * Detect if the accessibility given defines an adaptation for the visually
 * impaired.
 * Based on DVB Document A168 (DVB-DASH).
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function isVisuallyImpaired(accessibility: IRole) : boolean {
  if (!accessibility) {
    return false;
  }

  return (
    accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
    accessibility.value === "1"
  );
}

/**
 * Detect if the accessibility given defines an adaptation for the hard of
 * hearing.
 * Based on DVB Document A168 (DVB-DASH).
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function isHardOfHearing(accessibility: IAccessibility) {
  if (!accessibility) {
    return false;
  }

  return (
    accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
    accessibility.value === 2
  );
}

/**
 * @param {Node} root
 * @returns {Object}
 */
function parseScheme(root: Node): IScheme {
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

  return {
    schemeIdUri,
    value,
  };
}

/**
 * @param {Array.<string>}
 * @param {Object} finalObject
 * @param {Object} objectToInherit
 * @returns {Object}
 */
function inheritAttributes<T,U>(
  attributes : string[],
  finalObject : T,
  objectToInherit : U
) : T {
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    if (
      !finalObject.hasOwnProperty(attribute) &&
      objectToInherit.hasOwnProperty(attribute)
    ) {
      (finalObject as any)[attribute] = (objectToInherit as any)[attribute];
    }
  }
  return finalObject as T & U;
}

export {
  inheritAttributes,
  isHardOfHearing,
  isVisuallyImpaired,
  parseBoolean,
  parseByteRange,
  parseDateTime,
  parseDuration,
  parseFrameRate,
  parseIntOrBoolean,
  parseRatio,
  parseScheme,
  parseString,
};
