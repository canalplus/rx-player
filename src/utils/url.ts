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
 * Scheme part of an url (e.g. "http://").
 */
const schemeRe = /^(?:[a-z]+:)?\/\//i;

/**
 * Captures "/../" or "/./".
 */
const selfDirRe = /\/\.{1,2}\//;

/**
 * Resolve self directory and previous directory references to obtain a
 * "normalized" url.
 * @example "https://foo.bar/baz/booz/../biz" => "https://foo.bar/baz/biz"
 * @param {string} url
 * @returns {string}
 */
function _normalizeUrl(url : string) : string {
  // fast path if no ./ or ../ are present in the url
  if (!selfDirRe.test(url)) {
    return url;
  }

  const newUrl : string[] = [];
  const oldUrl = url.split("/");
  for (let i = 0, l = oldUrl.length; i < l; i++) {
    if (oldUrl[i] === "..") {
      newUrl.pop();
    } else if (oldUrl[i] === ".") {
      continue;
    } else {
      newUrl.push(oldUrl[i]);
    }
  }

  return newUrl.join("/");
}

/**
 * Construct an url from the arguments given.
 * Basically:
 *   - The last arguments that contains a scheme (e.g. "http://") is the base
 *     of the url.
 *   - every subsequent string arguments are concatened to it.
 * @param {...string|undefined} args
 * @returns {string}
 */
function resolveURL(...args : Array<string|undefined>) : string {
  const len = args.length;
  if (len === 0) {
    return "";
  }

  let base = "";
  for (let i = 0; i < len; i++) {
    let part = args[i];
    if (typeof part !== "string" || part === "") {
      continue;
    }
    if (schemeRe.test(part)) {
      base = part;
    }
    else {
      // trim if begins with "/"
      if (part[0] === "/") {
        part = part.substr(1);
      }

      // trim if ends with "/"
      if (base[base.length - 1] === "/") {
        base = base.substr(0, base.length - 1);
      }

      base = base + "/" + part;
    }
  }

  return _normalizeUrl(base);
}

/**
 * Remove string after the last '/'.
 * @param {string} url
 * @returns {string}
 */
function normalizeBaseURL(url : string) : string {
  const slash = url.lastIndexOf("/");
  if (slash >= 0) {
    return url.substring(0, slash + 1);
  } else {
    return url;
  }
}

export {
  resolveURL,
  normalizeBaseURL,
};
