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

import isNonEmptyString from "../../../../../utils/is_non_empty_string";
import resolveURL from "../../../../../utils/resolve_url";

/**
 * Pad with 0 in the left of the given n argument to reach l length
 * @param {Number|string} n
 * @param {Number} l
 * @returns {string}
 */
function padLeftWithZeros(n : number|string, l : number) : string {
  const nToString = n.toString();
  if (nToString.length >= l) {
    return nToString;
  }
  const arr = new Array(l + 1).join("0") + nToString;
  return arr.slice(-l);
}

/**
 * @param {string|number} replacer
 * @returns {Function}
 */
function processFormatedToken(
  replacer : string | number
) : (x: unknown, y: unknown, widthStr: string) => string {
  return (_match, _format, widthStr : string) => {
    const width = isNonEmptyString(widthStr) ? parseInt(widthStr, 10) :
                                               1;
    return padLeftWithZeros(String(replacer), width);
  };
}

/**
 * @param {string} representationURL
 * @param {string|undefined} media
 * @param {string|undefined} id
 * @param {number|undefined} bitrate
 * @returns {string}
 */
export function createIndexURLs(
  baseURLs : string[],
  media?: string,
  id?: string,
  bitrate?: number
): string[] | null {
  if (baseURLs.length === 0) {
    return media !== undefined ? [replaceRepresentationDASHTokens(media, id, bitrate)] :
                                 null;
  }
  return baseURLs.map(baseURL => {
    return replaceRepresentationDASHTokens(resolveURL(baseURL, media),
                                           id,
                                           bitrate);
  });
}

/**
 * Replace "tokens" written in a given path (e.g. $RepresentationID$) by the corresponding
 * infos, taken from the given segment.
 * @param {string} path
 * @param {string|undefined} id
 * @param {number|undefined} bitrate
 * @returns {string}
 */
export function replaceRepresentationDASHTokens(
  path: string,
  id?: string,
  bitrate?: number
): string {
  if (path.indexOf("$") === -1) {
    return path;
  } else {
    return path
      .replace(/\$\$/g, "$")
      .replace(/\$RepresentationID\$/g, String(id))
      .replace(/\$Bandwidth(|\%0(\d+)d)\$/g,
               processFormatedToken(bitrate === undefined ? 0 :
                                                            bitrate));
  }
}

/**
 * Create function allowing to replace "tokens" in a given DASH segment URL
 * (e.g. $Time$, which has to be replaced by the segment's start time) by the
 * right information.
 * @param {number|undefined} time
 * @param {number|undefined} nb
 * @returns {Function}
 */
export function createDashUrlDetokenizer(
  time : number | undefined,
  nb : number | undefined
) : (url : string) => string {
  /**
   * Replace the tokens in the given `url` by the segment information defined
   * by the outer function.
   * @param {string} url
   * @returns {string}
   *
   * @throws Error - Throws if we do not have enough data to construct the URL
   */
  return function replaceTokensInUrl(url : string) : string {
    if (url.indexOf("$") === -1) {
      return url;
    } else {
      return url
        .replace(/\$\$/g, "$")
        .replace(/\$Number(|\%0(\d+)d)\$/g, (_x, _y, widthStr : string) => {
          if (nb === undefined) {
            throw new Error("Segment number not defined in a $Number$ scheme");
          }
          return processFormatedToken(nb)(_x, _y, widthStr);
        })
        .replace(/\$Time(|\%0(\d+)d)\$/g, (_x, _y, widthStr : string) => {
          if (time === undefined) {
            throw new Error("Segment time not defined in a $Time$ scheme");
          }
          return processFormatedToken(time)(_x, _y, widthStr);
        });
    }
  };
}
