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
import type { IScheme } from "../../node_parser_types";
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
declare function parseBoolean(val: string, displayName: string): [boolean, MPDError | null];
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
declare function parseMPDInteger(val: string, displayName: string): [number | null, MPDError | null];
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
declare function parseMPDFloat(val: string, displayName: string): [number | null, MPDError | null];
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
declare function parseIntOrBoolean(val: string, displayName: string): [boolean | number | null, MPDError | null];
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
declare function parseDateTime(val: string, displayName: string): [number | null, MPDError | null];
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
declare function parseDuration(val: string, displayName: string): [number | null, MPDError | null];
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
declare function parseByteRange(val: string, displayName: string): [[number, number] | null, MPDError | null];
/**
 * Parse MPD base64 attribute into an Uint8Array.
 * the end.
 *
 * The returned value is a tuple of two elements where:
 *   1. the first value is the parsed value - or `null` if we could not parse
 *      it
 *   2. the second value is a possible error encountered while parsing this
 *      value - set to `null` if no error was encountered.
 * @param {string} val
 * @param {string} displayName
 * @returns {Uint8Array | Error | null>}
 */
declare function parseBase64(val: string, displayName: string): [Uint8Array | null, MPDError | null];
/**
 * Some values in the MPD can be expressed as divisions of integers (e.g. frame
 * rates).
 * This function tries to convert it to a floating point value.
 * @param {string} val
 * @param {string} displayName
 * @returns {Array.<number | Error | null>}
 */
declare function parseMaybeDividedNumber(val: string, displayName: string): [number | null, MPDError | null];
/**
 * @param {Element} root
 * @returns {Object}
 */
declare function parseScheme(root: Element): IScheme;
/**
 * Create a function to factorize the MPD parsing logic.
 * @param {Object} dest - The destination object which will contain the parsed
 * values.
 * @param {Array.<Error>} warnings - An array which will contain every parsing
 * error encountered.
 * @return {Function}
 */
declare function ValueParser<T>(dest: T, warnings: Error[]): (val: string, { asKey, parser, dashName, }: {
    asKey: keyof T;
    parser: (value: string, displayName: string) => [T[keyof T] | null, MPDError | null];
    dashName: string;
}) => void;
/**
 * Error arising when parsing the MPD.
 * @class MPDError
 * @extends Error
 */
declare class MPDError extends Error {
    readonly name: "MPDError";
    readonly message: string;
    /**
     * @param {string} message
     */
    constructor(message: string);
}
export { MPDError, ValueParser, parseBase64, parseBoolean, parseByteRange, parseDateTime, parseDuration, parseIntOrBoolean, parseMaybeDividedNumber, parseMPDFloat, parseMPDInteger, parseScheme, };
