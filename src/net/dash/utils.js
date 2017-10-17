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

/**
 * Pad with 0 in the left of the given n argument to reach l length
 * @param {Number|string} n
 * @param {Number} l
 * @returns {string}
 */
function pad(n, l) {
  n = n.toString();
  if (n.length >= l) {
    return n;
  }
  const arr = new Array(l + 1).join("0") + n;
  return arr.slice(-l);
}

/**
 * Add formatting when asked in a token (add padding to numbers).
 * @param {string|Number} replacer - the token value
 * @returns {Function} - @see replaceTokens
 */
function processFormatedToken(replacer) {
  return (match, format, widthStr) => {
    const width = widthStr ? parseInt(widthStr, 10) : 1;
    return pad(""+replacer, width);
  };
}

/**
 * Replace "tokens" written in a given path (e.g. $Time$) by the corresponding
 * infos, taken from the given segment.
 * @param {string} path
 * @param {Segment} segment
 * @returns {string}
 */
function replaceTokens(path, segment, representation) {
  if (path.indexOf("$") === -1) {
    return path;
  } else {
    return path
      .replace(/\$\$/g, "$")
      .replace(/\$RepresentationID\$/g,
        representation.id)
      .replace(/\$Bandwidth(|\%0(\d+)d)\$/g,
        processFormatedToken(representation.bitrate))
      .replace(/\$Number(|\%0(\d+)d)\$/g,
        processFormatedToken(segment.number))
      .replace(/\$Time(|\%0(\d+)d)\$/g,
        processFormatedToken(segment.time));
  }
}

/**
 * Returns true if the given texttrack segment represents a textrack embedded
 * in a mp4 file.
 * @param {Segment} segment - __TextTrack__ segment
 * @returns {Boolean}
 */
function isMP4EmbeddedTrack(representation) {
  return representation.mimeType === "application/mp4";
}

/**
 * Returns text-formatted byteRange (`bytes=$start-$end?)`
 * @param {Array.<string|Number>}
 * @returns {string}
 */
function byteRange([start, end]) {
  if (!end || end === Infinity) {
    return "bytes=" + (+start) + "-";
  } else {
    return "bytes=" + (+start) + "-" + (+end);
  }
}

export {
  pad,
  processFormatedToken,
  replaceTokens,
  isMP4EmbeddedTrack,
  byteRange,
};
