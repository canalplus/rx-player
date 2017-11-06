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

import Segment from "../../manifest/segment";
import Representation from "../../manifest/representation";

/**
 * Pad with 0 in the left of the given n argument to reach l length
 * @param {Number|string} n
 * @param {Number} l
 * @returns {string}
 */
function pad(n : number|string, l : number) : string {
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
function processFormatedToken(
  replacer : string|number
) : (x: string, y: number, widthStr: string) => string {
  return (_match, _format, widthStr : string) => {
    const width = widthStr ? parseInt(widthStr, 10) : 1;
    return pad("" + replacer, width);
  };
}

/**
 * Replace "tokens" written in a given path (e.g. $Time$) by the corresponding
 * infos, taken from the given segment.
 * @param {string} path
 * @param {Segment} segment
 * @param {Representation} representation
 * @returns {string}
 *
 * @throws Error - Throws if we do not have enough data to construct the URL
 */
function replaceTokens(
  path : string,
  segment : Segment,
  representation : Representation
) : string {
  if (path.indexOf("$") === -1) {
    return path;
  } else {
    return path
      .replace(/\$\$/g, "$")
      .replace(/\$RepresentationID\$/g,
        String(representation.id))
      .replace(/\$Bandwidth(|\%0(\d+)d)\$/g,
        processFormatedToken(representation.bitrate))
      .replace(/\$Number(|\%0(\d+)d)\$/g, (_x, _y, widthStr) => {
        if (segment.number == null) {
          throw new Error("Segment number not defined in a $Number$ scheme");
        }
        return processFormatedToken(segment.number)(_x, _y, widthStr);
      })
      .replace(/\$Time(|\%0(\d+)d)\$/g, (_x, _y, widthStr) => {
        if (segment.time == null) {
          throw new Error("Segment time not defined in a $Time$ scheme");
        }
        return processFormatedToken(segment.time)(_x, _y, widthStr);
      });
  }
}

/**
 * Returns true if the given texttrack segment represents a textrack embedded
 * in a mp4 file.
 * @param {Representation} representation
 * @returns {Boolean}
 */
function isMP4EmbeddedTrack(representation : Representation) : boolean {
  return representation.mimeType === "application/mp4";
}

/**
 * Returns text-formatted byteRange (`bytes=$start-$end?)`
 * @param {Array.<string|Number>}
 * @returns {string}
 */
function byteRange([start, end] : [number, number]) : string {
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
