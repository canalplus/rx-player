"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertSupplementalCodecsToRFC6381 = void 0;
var is_non_empty_string_1 = require("../../../../utils/is_non_empty_string");
var supplementalCodecSeparator = /[, ]+/g;
/**
 * Converts SCTE 214 supplemental codec string into RFC4281 codec string
 *
 * The returned value is a codec string respecting RFC6381
 *
 * SCTE 214 defines supplemental codecs as a whitespace-separated multiple list of
 * codec strings
 *
 * RFC6381 defines codecs as a comma-separated list of codec strings.
 *
 * This two syntax differs and this parser is used to convert SCTE214
 * to be compliant with what MSE APIs expect
 *
 * @param {string} val - The codec string to parse
 * @returns { Array.<string | undefined | null>}
 */
function convertSupplementalCodecsToRFC6381(val) {
    if ((0, is_non_empty_string_1.default)(val)) {
        return val.trim().replace(supplementalCodecSeparator, ", ");
    }
    return "";
}
exports.convertSupplementalCodecsToRFC6381 = convertSupplementalCodecsToRFC6381;
