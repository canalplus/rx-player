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
import { resolveURL } from "../../../utils/url";
import { IRole } from "../types";

export interface IScheme {
  schemeIdUri? : string;
  value? : string;
}

export interface IAccessibility {
  schemeIdUri?: string;
  value?: string|number;
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
  if (!date) {
    return 0;
  }

  const match = iso8601Duration.exec(date) as RegExpExecArray;
  assert(!!match, `${date} is not a valid ISO8601 duration`);

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
    accessibility.value === "2"
  );
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

  return {
    schemeIdUri,
    value,
  };
}

/**
 * Pad with 0 in the left of the given n argument to reach l length
 * @param {Number|string} n
 * @param {Number} l
 * @returns {string}
 */
function pad(n : number|string, l : number) : string {
  const nToString = n.toString();
  if (nToString.length >= l) {
    return nToString;
  }
  const arr = new Array(l + 1).join("0") + nToString;
  return arr.slice(-l);
}

function processFormatedToken(
  replacer : string|number
) : (x: string, y: number, widthStr: string) => string {
  return (_match, _format, widthStr : string) => {
    const width = widthStr ? parseInt(widthStr, 10) : 1;
    return pad("" + replacer, width);
  };
}

/**
 * @param {string} representationURL
 * @param {string|undefined} media
 * @param {string|undefined} id
 * @param {number|undefined} bitrate
 * @returns {string}
 */
function createIndexURL(
  representationURL : string,
  media?: string,
  id?: string,
  bitrate?: number
): string {
  return replaceRepresentationDASHTokens(
    resolveURL(representationURL, media),
    id,
    bitrate
  );
}

/**
 * Replace "tokens" written in a given path (e.g. $RepresentationID$) by the corresponding
 * infos, taken from the given segment.
 * @param {string} path
 * @param {string|undefined} id
 * @param {number|undefined} bitrate
 * @returns {string}
 */
function replaceRepresentationDASHTokens(
  path: string,
  id?: string,
  bitrate?: number
): string {
  if (path.indexOf("$") === -1) {
    return path;
  } else {
    return path
      .replace(/\$\$/g, "$")
      .replace(/\$RepresentationID\$/g, String(id))
      .replace(/\$Bandwidth(|\%0(\d+)d)\$/g, processFormatedToken(bitrate || 0));
  }
}

/**
 * Replace "tokens" written in a given path (e.g. $Time$) by the corresponding
 * infos, taken from the given segment.
 * @param {string} path
 * @param {number} time
 * @param {number} number
 * @returns {string}
 *
 * @throws Error - Throws if we do not have enough data to construct the URL
 */
function replaceSegmentDASHTokens(
  path : string,
  time? : number,
  number? : number
) : string {
  if (path.indexOf("$") === -1) {
    return path;
  } else {
    return path
      .replace(/\$\$/g, "$")
      .replace(/\$Number(|\%0(\d+)d)\$/g, (_x, _y, widthStr) => {
        if (number == null) {
          throw new Error("Segment number not defined in a $Number$ scheme");
        }
        return processFormatedToken(number)(_x, _y, widthStr);
      })
      .replace(/\$Time(|\%0(\d+)d)\$/g, (_x, _y, widthStr) => {
        if (time == null) {
          throw new Error("Segment time not defined in a $Time$ scheme");
        }
        return processFormatedToken(time)(_x, _y, widthStr);
      });
  }
}

export {
  createIndexURL,
  replaceSegmentDASHTokens,
  replaceRepresentationDASHTokens,
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
