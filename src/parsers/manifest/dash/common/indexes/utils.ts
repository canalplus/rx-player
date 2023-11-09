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

import config from "../../../../../config";
import isNonEmptyString from "../../../../../utils/is_non_empty_string";


/**
 * In Javascript, numbers are encoded in a way that a floating number may be
 * represented internally with a rounding error.
 *
 * This function returns a small number allowing to accound for rounding many
 * rounding errors.
 * @param {number} timescale
 * @returns {boolean}
 */
export function getSegmentTimeRoundingError(timescale: number): number {
  return config.getCurrent().DEFAULT_MAXIMUM_TIME_ROUNDING_ERROR * timescale;
}

const supplementalCodecSeparator = /[, ]+/g;
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
export function convertSupplementalCodecsToRFC6381(
  val: string
) : string {

  if (isNonEmptyString(val)) {
    return val
      .trim()
      .replace(supplementalCodecSeparator, ", ");
  }
  return "";
}


