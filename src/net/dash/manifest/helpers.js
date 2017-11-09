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
// <http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd>

import arrayIncludes from "../../../utils/array-includes.js";
import assert from "../../../utils/assert";

const iso8601Duration = /^P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T?(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/;
const rangeRe = /([0-9]+)-([0-9]+)/;
const frameRateRe = /([0-9]+)(\/([0-9]+))?/;

const KNOWN_ADAPTATION_TYPES = ["audio", "video", "text", "image"];

/**
 * @param {Object} index
 * @returns {Number|undefined}
 */
function calculateIndexLastLiveTimeReference(index) {
  if (index.indexType === "timeline") {
    const { ts, r, d } = index.timeline[index.timeline.length - 1];

    // TODO FIXME does that make sense?
    const securityTime = Math.min(Math.max(d / index.timescale, 5), 10);
    return ((ts + (r+1)*d) / index.timescale) - securityTime;
  }
}

/**
 * Parse MPD string attributes.
 * @param {string} str
 * @returns {string} - the same string
 */
function parseString(str) {
  return str;
}

/**
 * Parse MPD boolean attributes.
 * @param {string}
 * @returns {Boolean}
 */
function parseBoolean(str) {
  return str == "true";
}

/**
 * Parse some MPD attributes.
 * @param {string}
 * @returns {Boolean|Number}
 */
function parseIntOrBoolean(str) {
  if (str == "true") {
    return true;
  }
  if (str == "false") {
    return false;
  }
  return parseInt(str);
}

/**
 * Parse MPD date attributes.
 * @param {string}
 * @returns {Date}
 */
function parseDateTime(str) {
  return new Date(Date.parse(str));
}

/**
 * Parse MPD ISO8601 duration attributes into seconds.
 * @param {string}
 * @returns {Number}
 */
function parseDuration(date) {
  if (!date) {
    return 0;
  }

  const match = iso8601Duration.exec(date);
  assert(match, `${date} is not a valid ISO8601 duration`);

  return (
    parseFloat(match[2]  || 0) * 365 * 24 * 60 * 60 +
    parseFloat(match[4]  || 0) * 30 * 24 * 60 * 60 + // not precise +
    parseFloat(match[6]  || 0) * 24 * 60 * 60 +
    parseFloat(match[8]  || 0) * 60 * 60 +
    parseFloat(match[10] || 0) * 60 +
    parseFloat(match[12] || 0)
  );
}

/**
 * Parse MPD frame rate attributes.
 * -1 if the frameRate could not be parsed,
 * @param {string} str
 * @returns {Number}
 */
function parseFrameRate(str) {
  const match = frameRateRe.exec(str);
  if (!match) {
    return -1;
  }

  const nom = parseInt(match[1]) || 0;
  const den = parseInt(match[2]) || 0;
  return den > 0
    ? nom / den
    : nom;
}

/**
 * Parse MPD ratio attributes.
 * @param {string} str
 * @returns {string}
 */
function parseRatio(str) {
  return str;
}

/**
 * Parse MPD byterange attributes into arrays of two elements: the start and
 * the end.
 * @param {string} str
 * @returns {Array.<Number>}
 */
function parseByteRange(str) {
  const match = rangeRe.exec(str);
  if (!match) {
    return null;
  } else {
    return [+match[1], +match[2]];
  }
}

/**
 * Reduce on each immediate children from the Document object given.
 * @param {Document} root
 * @param {Function} fn - Will be called on each children with the following
 * arguments:
 *   1. the reducer's accumulator
 *   2. the current node's name
 *   3. the current node Document Object
 * @param {*} init - the initial value for the accumulator
 * @returns {*} - the accumulator
 */
function reduceChildren(root, fn, init) {
  let node = root.firstElementChild, r = init;
  while (node) {
    r = fn(r, node.nodeName, node);
    node = node.nextElementSibling;
  }
  return r;
}

/**
 * Detect if the accessibility given defines an adaptation for the visually
 * impaired.
 * Based on DVB Document A168 (DVB-DASH).
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function isVisuallyImpaired(accessibility) {
  if (!accessibility) {
    return false;
  }

  return (
    accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
    accessibility.value === 1
  );
}

/**
 * Infers the type of adaptation from codec and mimetypes found in it.
 *
 * This follows the guidelines defined by the DASH-IF IOP:
 *   - one adaptation set contains a single media type
 *   - The order of verifications are:
 *       1. mimeType
 *       2. Role
 *       3. codec
 *
 * Note: This is based on DASH-IF-IOP-v4.0 with some more freedom.
 * @param {Object} adaptation
 * @returns {string} - "audio"|"video"|"text"|"image"|"metadata"|"unknown"
 */
function inferAdaptationType(adaptation) {
  const { mimeType = "" } = adaptation;
  const topLevel = mimeType.split("/")[0];
  if (arrayIncludes(KNOWN_ADAPTATION_TYPES, topLevel)) {
    return topLevel;
  }

  if (mimeType === "application/bif") {
    return "image";
  }

  if (mimeType === "application/ttml+xml") {
    return "text";
  }

  // manage DASH-IF mp4-embedded subtitles and metadata
  if (mimeType === "application/mp4") {
    const { role } = adaptation;
    if (role) {
      if (
        role.schemeIdUri === "urn:mpeg:dash:role:2011" &&
        role.value === "subtitle"
      ) {
        return "text";
      }
    }
    return "metadata";
  }

  // take 1st representation's mimetype as default
  const { representations = [] } = adaptation;
  if (representations.length) {
    const firstReprMimeType = representations[0].mimeType;
    const topLevel = firstReprMimeType.split("/")[0];
    if (arrayIncludes(KNOWN_ADAPTATION_TYPES, topLevel)) {
      return topLevel;
    }
  }

  // TODO infer from representations' codecs?
  return "unknown";
}

/**
 * Detect if the accessibility given defines an adaptation for the hard of
 * hearing.
 * Based on DVB Document A168 (DVB-DASH).
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function isHardOfHearing(accessibility) {
  if (!accessibility) {
    return false;
  }

  return (
    accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
    accessibility.value === 2
  );
}

/**
 * Returns "last time of reference" from the adaptation given, considering a
 * live content.
 * Undefined if a time could not be found.
 *
 * We consider the earliest last time from every representations in the given
 * adaptation.
 *
 * This is done to calculate a liveGap which is valid for the whole manifest,
 * even in weird ones.
 * @param {Object} adaptation
 * @returns {Number|undefined}
 */
const getLastLiveTimeReference = (adaptation) => {
  // Here's how we do, for each possibility:
  //  1. only the adaptation has an index (no representation has):
  //    - returns the index last time reference
  //
  //  2. every representations have an index:
  //    - returns minimum for every representations
  //
  //  3. not all representations have an index but the adaptation has
  //    - returns minimum between all representations and the adaptation
  //
  //  4. no index for 1+ representation(s) and no adaptation index:
  //    - returns undefined
  //
  //  5. Invalid index found somewhere:
  //    - returns undefined

  if (!adaptation) {
    return;
  }

  const representations = adaptation.representations || [];
  const representationsWithIndex = representations.filter(r => r && r.index);

  if (!representations.length) {
    return calculateIndexLastLiveTimeReference(adaptation.index);
  }

  const representationsMin = Math.min(
    ...representationsWithIndex
      .map(r => calculateIndexLastLiveTimeReference(r.index))
  );

  // if the last live time reference could not be calculated, return undefined
  if (isNaN(representationsMin)) {
    return;
  }

  if (representations.length === representationsWithIndex.length) {
    return representationsMin;
  }

  if (adaptation.index) {
    const adaptationRef = calculateIndexLastLiveTimeReference(adaptation.index);
    return Math.min(representationsMin, adaptationRef);
  }
};

export {
  parseString,
  parseFrameRate,
  parseByteRange,
  parseBoolean,
  parseDateTime,
  parseDuration,
  parseIntOrBoolean,
  parseRatio,
  reduceChildren,
  getLastLiveTimeReference,
  isHardOfHearing,
  isVisuallyImpaired,
  inferAdaptationType,
};
