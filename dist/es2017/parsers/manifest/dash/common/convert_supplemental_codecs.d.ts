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
export declare function convertSupplementalCodecsToRFC6381(val: string): string;
