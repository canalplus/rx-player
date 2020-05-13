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

import log from "../../../../log";
import isNonEmptyString from "../../../../utils/is_non_empty_string";

export interface IScheme { schemeIdUri? : string;
                           value? : string; }

const iso8601Duration =
  /^P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T?(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/;
const rangeRe = /([0-9]+)-([0-9]+)/;

/**
 * Parse MPD boolean attributes.
 *
 * The returned value is a tuple of two elements where:
 *   1. the first value is the parsed boolean - or `null` if we could not parse
 *      it
 *   2. the second value is a possible error encountered while parsing this
 *      value - set to `null` if no error was encountered.
 * @param {string} val - The value to parse
 * @param {string} displayName - The name of the property. Used for error
 * formatting.
 * @returns {Array.<Boolean | Error | null>}
 */
function parseBoolean(
  val : string,
  displayName : string
) : [boolean,
     MPDError | null]
{
  if (val === "true") {
    return [true, null];
  }
  if (val === "false") {
    return [false, null];
  }
  const error = new MPDError(
    `\`${displayName}\` property is not a boolean value but "${val}"`);
  return [false, error];
}

/**
 * Parse MPD integer attributes.
 *
 * The returned value is a tuple of two elements where:
 *   1. the first value is the parsed boolean - or `null` if we could not parse
 *      it
 *   2. the second value is a possible error encountered while parsing this
 *      value - set to `null` if no error was encountered.
 * @param {string} val - The value to parse
 * @param {string} displayName - The name of the property. Used for error
 * formatting.
 * @returns {Array.<number | Error | null>}
 */
function parseMPDInteger(
  val : string,
  displayName : string
) : [number | null,
     MPDError | null]
{
  const toInt = parseInt(val, 10);
  if (isNaN(toInt)) {
    const error = new MPDError(
      `\`${displayName}\` property is not an integer value but "${val}"`);
    return [null, error];

  }
  return [toInt, null];
}

/**
 * Parse MPD float attributes.
 *
 * The returned value is a tuple of two elements where:
 *   1. the first value is the parsed boolean - or `null` if we could not parse
 *      it
 *   2. the second value is a possible error encountered while parsing this
 *      value - set to `null` if no error was encountered.
 * @param {string} val - The value to parse
 * @param {string} displayName - The name of the property. Used for error
 * formatting.
 * @returns {Array.<number | Error | null>}
 */
function parseMPDFloat(
  val : string,
  displayName : string
) : [number | null,
     MPDError | null]
{
  const toInt = parseFloat(val);
  if (isNaN(toInt)) {
    const error = new MPDError(
      `\`${displayName}\` property is not an integer value but "${val}"`);
    return [null, error];

  }
  return [toInt, null];
}

/**
 * Parse MPD attributes which are either integer or boolean values.
 *
 * The returned value is a tuple of two elements where:
 *   1. the first value is the parsed value - or `null` if we could not parse
 *      it
 *   2. the second value is a possible error encountered while parsing this
 *      value - set to `null` if no error was encountered.
 * @param {string} val - The value to parse
 * @param {string} displayName - The name of the property. Used for error
 * formatting.
 * @returns {Array.<Boolean | number | Error | null>}
 */
function parseIntOrBoolean(
  val : string,
  displayName : string
) : [ boolean | number | null,
      MPDError | null ] {
  if (val === "true") {
    return [true, null];
  }
  if (val === "false") {
    return [false, null];
  }
  const toInt = parseInt(val, 10);
  if (isNaN(toInt)) {
    const error = new MPDError(
      `\`${displayName}\` property is not a boolean nor an integer but "${val}"`);
    return [null, error];
  }
  return [toInt, null];
}

/**
 * Parse MPD date attributes.
 *
 * The returned value is a tuple of two elements where:
 *   1. the first value is the parsed value - or `null` if we could not parse
 *      it
 *   2. the second value is a possible error encountered while parsing this
 *      value - set to `null` if no error was encountered.
 * @param {string} val - The value to parse
 * @param {string} displayName - The name of the property. Used for error
 * formatting.
 * @returns {Array.<Date | null | Error>}
 */
function parseDateTime(
  val : string,
  displayName : string
) : [number | null,
     MPDError | null ] {
  const parsed = Date.parse(val);
  if (isNaN(parsed)) {
    const error = new MPDError(
      `\`${displayName}\` is in an invalid date format: "${val}"`);
    return [null, error];
  }
  return [new Date(Date.parse(val)).getTime() / 1000, null];
}

/**
 * Parse MPD ISO8601 duration attributes into seconds.
 *
 * The returned value is a tuple of two elements where:
 *   1. the first value is the parsed value - or `null` if we could not parse
 *      it
 *   2. the second value is a possible error encountered while parsing this
 *      value - set to `null` if no error was encountered.
 * @param {string} val - The value to parse
 * @param {string} displayName - The name of the property. Used for error
 * formatting.
 * @returns {Array.<number | Error | null>}
 */
function parseDuration(
  val : string,
  displayName : string
) : [number | null,
     MPDError | null] {

  if (!isNonEmptyString(val)) {
    const error = new MPDError(`\`${displayName}\` property is empty`);
    return [0, error];
  }

  const match = iso8601Duration.exec(val) as RegExpExecArray;
  if (match === null) {
    const error = new MPDError(
      `\`${displayName}\` property has an unrecognized format "${val}"`);
    return [null, error];
  }

  const duration =
    (parseFloat(isNonEmptyString(match[2]) ? match[2] :
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
  return [duration, null];
}

/**
 * Parse MPD byterange attributes into arrays of two elements: the start and
 * the end.
 *
 * The returned value is a tuple of two elements where:
 *   1. the first value is the parsed value - or `null` if we could not parse
 *      it
 *   2. the second value is a possible error encountered while parsing this
 *      value - set to `null` if no error was encountered.
 * @param {string} val
 * @param {string} displayName
 * @returns {Array.<Array.<number> | Error | null>}
 */
function parseByteRange(
  val : string,
  displayName : string
) : [ [number, number] | null, MPDError | null ] {
  const match = rangeRe.exec(val);
  if (match === null) {
    const error = new MPDError(
      `\`${displayName}\` property has an unrecognized format "${val}"`);
    return [null, error];
  } else {
    return [[+match[1], +match[2]], null];
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

/**
 * Create a function to factorize the MPD parsing logic.
 * @param {Object} dest - The destination object which will contain the parsed
 * values.
 * @param {Array.<Error>} warnings - An array which will contain every parsing
 * error encountered.
 * @return {Function}
 */
function ValueParser<T>(
  dest : T,
  warnings : Error[]
) {
  /**
   * Parse a single value and add it to the `dest` objects.
   * If an error arised while parsing, add it at the end of the `warnings` array.
   * @param {string} objKey - The key which will be added to the `dest` object.
   * @param {string} val - The value found in the MPD which we should parse.
   * @param {Function} parsingFn - The parsing function adapted for this value.
   * @param {string} displayName - The name of the key as it appears in the MPD.
   * This is used only in error formatting,
   */
  return function(
    objKey : keyof T,
    val : string,
    parsingFn : (val : string,
                 displayName : string) => [T[keyof T] | null, MPDError | null],
    displayName : string
  ) : void {
    const [parsingResult, parsingError] = parsingFn(val, displayName);
    if (parsingError !== null) {
      log.warn(parsingError.message);
      warnings.push(parsingError);
    }

    if (parsingResult !== null) {
      dest[objKey] = parsingResult;
    }
  };
}

/**
 * Error arising when parsing the MPD.
 * @class MPDError
 * @extends Error
 */
class MPDError extends Error {
  public readonly name : "MPDError";
  public readonly message : string;

  /**
   * @param {string} message
   */
  constructor(message : string) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, MPDError.prototype);

    this.name = "MPDError";
    this.message = message;
  }
}

export {
  MPDError,
  ValueParser,
  parseBoolean,
  parseByteRange,
  parseDateTime,
  parseDuration,
  parseIntOrBoolean,
  parseMPDFloat,
  parseMPDInteger,
  parseScheme,
};
