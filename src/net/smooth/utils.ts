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

// for typings
import Representation from "../../manifest/representation";
import Segment from "../../manifest/segment";

const ISM_REG = /\.(isml?)(\?token=\S+)?$/;
const TOKEN_REG = /\?token=(\S+)/;

function byteRange([start, end] : [number, number]) : string {
  if (!end || end === Infinity) {
    return "bytes=" + (+start) + "-";
  } else {
    return "bytes=" + (+start) + "-" + (+end);
  }
}

/**
 * TODO Remove this logic completely from the player
 * @returns {string|null}
 */
function extractISML(doc : Document) : string|null {
  return doc.getElementsByTagName("media")[0].getAttribute("src");
}

/**
 * Returns string corresponding to the token contained in the url's querystring.
 * Empty string if no token is found.
 * @param {string} url
 * @returns {string}
 */
function extractToken(url : string) : string {
  const tokenMatch = url.match(TOKEN_REG);
  return (tokenMatch && tokenMatch[1]) || "";
}

/**
 * Replace/Remove token from the url's querystring
 * @param {string} url
 * @param {string} [token]
 * @returns {string}
 */
function replaceToken(url : string, token? : string) : string {
  if (token) {
    return url.replace(TOKEN_REG, "?token=" + token);
  } else {
    return url.replace(TOKEN_REG, "");
  }
}

/**
 * @param {string} url
 * @returns {string}
 */
function resolveManifest(url : string) : string {
  const ismMatch = url.match(ISM_REG);
  if (ismMatch) {
    return url.replace(ismMatch[1], ismMatch[1] + "/manifest");
  } else {
    return url;
  }
}

/**
 * @param {string} url
 * @param {Representation} representation
 * @param {Segment} segment
 * @returns {string}
 */
function buildSegmentURL(
  url : string,
  representation : Representation,
  segment : Segment
) : string {
  return url
    .replace(/\{bitrate\}/g,    String(representation.bitrate))
    .replace(/\{start time\}/g, String(segment.time));
}

export {
  byteRange,
  extractISML,
  extractToken,
  replaceToken,
  resolveManifest,
  buildSegmentURL,
};
