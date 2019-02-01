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

import warnOnce from "../../utils/warn_once";

const ISM_REG = /(\.isml?)(\?token=\S+)?$/;
const TOKEN_REG = /\?token=(\S+)/;

/**
 * TODO Remove this logic completely from the player
 * @param {Document} doc
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
  if (ISM_REG.test(url)) {
    warnOnce("Giving a isml URL to loadVideo is deprecated." +
      " Please give the Manifest URL directly");
    return url.replace(ISM_REG, "$1/manifest$2");
  }
  return url;
}

export {
  extractISML,
  extractToken,
  replaceToken,
  resolveManifest,
};
