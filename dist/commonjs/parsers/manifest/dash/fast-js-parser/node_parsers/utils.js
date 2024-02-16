"use strict";
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseScheme = exports.parseMPDInteger = exports.parseMPDFloat = exports.parseMaybeDividedNumber = exports.parseIntOrBoolean = exports.parseDuration = exports.parseDateTime = exports.parseByteRange = exports.parseBoolean = exports.parseBase64 = exports.ValueParser = exports.MPDError = exports.textContent = void 0;
// XML-Schema
// <http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd>
var log_1 = require("../../../../../log");
var base64_1 = require("../../../../../utils/base64");
var is_non_empty_string_1 = require("../../../../../utils/is_non_empty_string");
var is_null_or_undefined_1 = require("../../../../../utils/is_null_or_undefined");
var xml_parser_1 = require("../../../../../utils/xml-parser");
var iso8601Duration = /^P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T?(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/;
var rangeRe = /([0-9]+)-([0-9]+)/;
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
function parseBoolean(val, displayName) {
    if (val === "true") {
        return [true, null];
    }
    if (val === "false") {
        return [false, null];
    }
    var error = new MPDError("`".concat(displayName, "` property is not a boolean value but \"").concat(val, "\""));
    return [false, error];
}
exports.parseBoolean = parseBoolean;
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
function parseMPDInteger(val, displayName) {
    var toInt = parseInt(val, 10);
    if (isNaN(toInt)) {
        var error = new MPDError("`".concat(displayName, "` property is not an integer value but \"").concat(val, "\""));
        return [null, error];
    }
    return [toInt, null];
}
exports.parseMPDInteger = parseMPDInteger;
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
function parseMPDFloat(val, displayName) {
    if (val === "INF") {
        return [Infinity, null];
    }
    var toInt = parseFloat(val);
    if (isNaN(toInt)) {
        var error = new MPDError("`".concat(displayName, "` property is invalid: \"").concat(val, "\""));
        return [null, error];
    }
    return [toInt, null];
}
exports.parseMPDFloat = parseMPDFloat;
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
function parseIntOrBoolean(val, displayName) {
    if (val === "true") {
        return [true, null];
    }
    if (val === "false") {
        return [false, null];
    }
    var toInt = parseInt(val, 10);
    if (isNaN(toInt)) {
        var error = new MPDError("`".concat(displayName, "` property is not a boolean nor an integer but \"").concat(val, "\""));
        return [null, error];
    }
    return [toInt, null];
}
exports.parseIntOrBoolean = parseIntOrBoolean;
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
function parseDateTime(val, displayName) {
    var parsed = Date.parse(val);
    if (isNaN(parsed)) {
        var error = new MPDError("`".concat(displayName, "` is in an invalid date format: \"").concat(val, "\""));
        return [null, error];
    }
    return [new Date(Date.parse(val)).getTime() / 1000, null];
}
exports.parseDateTime = parseDateTime;
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
function parseDuration(val, displayName) {
    if (!(0, is_non_empty_string_1.default)(val)) {
        var error = new MPDError("`".concat(displayName, "` property is empty"));
        return [0, error];
    }
    var match = iso8601Duration.exec(val);
    if (match === null) {
        var error = new MPDError("`".concat(displayName, "` property has an unrecognized format \"").concat(val, "\""));
        return [null, error];
    }
    var duration = parseFloat((0, is_non_empty_string_1.default)(match[2]) ? match[2] : "0") * 365 * 24 * 60 * 60 +
        parseFloat((0, is_non_empty_string_1.default)(match[4]) ? match[4] : "0") * 30 * 24 * 60 * 60 +
        parseFloat((0, is_non_empty_string_1.default)(match[6]) ? match[6] : "0") * 24 * 60 * 60 +
        parseFloat((0, is_non_empty_string_1.default)(match[8]) ? match[8] : "0") * 60 * 60 +
        parseFloat((0, is_non_empty_string_1.default)(match[10]) ? match[10] : "0") * 60 +
        parseFloat((0, is_non_empty_string_1.default)(match[12]) ? match[12] : "0");
    return [duration, null];
}
exports.parseDuration = parseDuration;
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
function parseByteRange(val, displayName) {
    var match = rangeRe.exec(val);
    if (match === null) {
        var error = new MPDError("`".concat(displayName, "` property has an unrecognized format \"").concat(val, "\""));
        return [null, error];
    }
    else {
        return [[+match[1], +match[2]], null];
    }
}
exports.parseByteRange = parseByteRange;
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
function parseBase64(val, displayName) {
    try {
        return [(0, base64_1.base64ToBytes)(val), null];
    }
    catch (_) {
        var error = new MPDError("`".concat(displayName, "` is not a valid base64 string: \"").concat(val, "\""));
        return [null, error];
    }
}
exports.parseBase64 = parseBase64;
/**
 * Some values in the MPD can be expressed as divisions of integers (e.g. frame
 * rates).
 * This function tries to convert it to a floating point value.
 * @param {string} val
 * @param {string} displayName
 * @returns {Array.<number | Error | null>}
 */
function parseMaybeDividedNumber(val, displayName) {
    var matches = /^(\d+)\/(\d+)$/.exec(val);
    if (matches !== null) {
        // No need to check, we know both are numbers
        return [+matches[1] / +matches[2], null];
    }
    return parseMPDFloat(val, displayName);
}
exports.parseMaybeDividedNumber = parseMaybeDividedNumber;
/**
 * @param {Object} root
 * @returns {Object}
 */
function parseScheme(root) {
    var e_1, _a;
    var schemeIdUri;
    var value;
    try {
        for (var _b = __values(Object.keys(root.attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var attributeName = _c.value;
            var attributeVal = root.attributes[attributeName];
            if ((0, is_null_or_undefined_1.default)(attributeVal)) {
                continue;
            }
            switch (attributeName) {
                case "schemeIdUri":
                    schemeIdUri = attributeVal;
                    break;
                case "value":
                    value = attributeVal;
                    break;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return { schemeIdUri: schemeIdUri, value: value };
}
exports.parseScheme = parseScheme;
/**
 * Create a function to factorize the MPD parsing logic.
 * @param {Object} dest - The destination object which will contain the parsed
 * values.
 * @param {Array.<Error>} warnings - An array which will contain every parsing
 * error encountered.
 * @return {Function}
 */
function ValueParser(dest, warnings) {
    /**
     * Parse a single value and add it to the `dest` objects.
     * If an error arised while parsing, add it at the end of the `warnings` array.
     * @param {string} objKey - The key which will be added to the `dest` object.
     * @param {string} val - The value found in the MPD which we should parse.
     * @param {Function} parsingFn - The parsing function adapted for this value.
     * @param {string} displayName - The name of the key as it appears in the MPD.
     * This is used only in error formatting,
     */
    return function (val, _a) {
        var asKey = _a.asKey, parser = _a.parser, dashName = _a.dashName;
        var _b = __read(parser(val, dashName), 2), parsingResult = _b[0], parsingError = _b[1];
        if (parsingError !== null) {
            log_1.default.warn(parsingError.message);
            warnings.push(parsingError);
        }
        if (parsingResult !== null) {
            dest[asKey] = parsingResult;
        }
    };
}
exports.ValueParser = ValueParser;
/**
 * Error arising when parsing the MPD.
 * @class MPDError
 * @extends Error
 */
var MPDError = /** @class */ (function (_super) {
    __extends(MPDError, _super);
    /**
     * @param {string} message
     */
    function MPDError(message) {
        var _this = _super.call(this) || this;
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(_this, MPDError.prototype);
        _this.name = "MPDError";
        _this.message = message;
        return _this;
    }
    return MPDError;
}(Error));
exports.MPDError = MPDError;
/**
 * Obtain the equivalent of the `textContent` HTMLElement call for that node.
 * @param {Array} children
 * @returns {string}
 */
function textContent(children) {
    return (0, xml_parser_1.toContentString)(children);
}
exports.textContent = textContent;
