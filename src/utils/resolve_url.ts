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

import startsWith from "./starts_with";

// Scheme part of an url (e.g. "http://").
const schemeRe = /^(?:[a-z]+:)?\/\//i;

/** 
 * Match the different components of an URL.
 * 
 *     foo://example.com:8042/over/there?name=ferret#nose
       \_/   \______________/\_________/ \_________/ \__/
        |           |            |            |        |
      scheme     authority       path        query   fragment
 * 1st match is the scheme: (e.g. "foo://")
 * 2nd match is the authority (e.g "example.com:8042")
 * 3rd match is the path (e.g "/over/there")
 * 4th match is the query params (e.g "name=ferret")
 * 5th match is the fragment (e.g "nose")
 * */
const urlComponentRegex =
  /^(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/;

// Captures "/../" or "/./".
const selfDirRe = /\/\.{1,2}\//;

/**
 * Resolve self directory and previous directory references to obtain a
 * "normalized" url.
 * @example "https://foo.bar/baz/booz/../biz" => "https://foo.bar/baz/biz"
 * @param {string} url
 * @returns {string}
 */
function _normalizeUrl(url: string): string {
  // fast path if no ./ or ../ are present in the url
  if (!selfDirRe.test(url)) {
    return url;
  }

  const newUrl: string[] = [];
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
 * Simple algorithm that uses WhatWC `new URL`.
 * Fails on some rare edge case, see unit test.
 * @param args
 * @returns
 */
export const resolveURLWhatWcURL = (...args: Array<string | undefined>): string => {
  const filteredArgs = args.filter((val) => val !== "");
  const len = filteredArgs.length;
  if (len === 0) {
    return "";
  }

  const base = filteredArgs[0] ?? "";
  const relative = filteredArgs[1] ?? "";

  const output = new URL(relative, base);
  if (filteredArgs.length <= 2) {
    return output.toString();
  } else {
    const remainingArgs = filteredArgs.slice(2);
    return resolveURL(output.toString(), ...remainingArgs);
  }
};

/**
 * Construct an url from the arguments given.
 * Basically:
 *   - The last arguments that contains a scheme (e.g. "http://") is the base
 *     of the url.
 *   - every subsequent string arguments are concatened to it.
 * @param {...string|undefined} args
 * @returns {string}
 */
export const resolveURLegacy = (...args: Array<string | undefined>): string => {
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
    } else {
      // trim if begins with "/"
      if (part[0] === "/") {
        part = part.substring(1);
      }

      // trim if ends with "/"
      if (base[base.length - 1] === "/") {
        base = base.substring(0, base.length - 1);
      }

      base = base + "/" + part;
    }
  }

  return _normalizeUrl(base);
};

/**
 * In a given URL, find the index at which the filename begins.
 * That is, this function finds the index of the last `/` character and returns
 * the index after it, returning the length of the whole URL if no `/` was found
 * after the scheme (i.e. in `http://`, the slashes are not considered).
 * @param {string} url
 * @returns {number}
 */
function getFilenameIndexInUrl(url: string): number {
  const indexOfLastSlash = url.lastIndexOf("/");
  if (indexOfLastSlash < 0) {
    return url.length;
  }

  if (schemeRe.test(url)) {
    const firstSlashIndex = url.indexOf("/");
    if (firstSlashIndex >= 0 && indexOfLastSlash === firstSlashIndex + 1) {
      // The "/" detected is actually the one from the protocol part of the URL
      // ("https://")
      return url.length;
    }
  }

  const indexOfQuestionMark = url.indexOf("?");
  if (indexOfQuestionMark >= 0 && indexOfQuestionMark < indexOfLastSlash) {
    // There are query parameters. Let's ignore them and re-run the logic
    // without
    return getFilenameIndexInUrl(url.substring(0, indexOfQuestionMark));
  }

  return indexOfLastSlash + 1;
}

/**
 * Resolve the output URL from the baseURL and the relative reference as
 * specified by RFC 3986 section 5.
 * @param base
 * @param relative
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5
 * @example base: http://example.com | relative: /b/c | output: http://example.com/b/c
 * @returns the resolved url
 */
const _resolveURL = (base: string, relative: string) => {
  const baseParts = parseURL(base);
  const relativeParts = parseURL(relative);

  if (relativeParts.scheme) {
    return formatURL(relativeParts);
  }

  const target: ParsedURL = {
    scheme: baseParts.scheme,
    authority: baseParts.authority,
    path: "",
    query: relativeParts.query,
    fragment: relativeParts.fragment,
  };

  if (relativeParts.authority) {
    target.authority = relativeParts.authority;
    target.path = removeDotSegment(relativeParts.path);
    return formatURL(target);
  }

  if (relativeParts.path === "") {
    target.path = baseParts.path;
    if (!relativeParts.query) {
      target.query = baseParts.query;
    }
  } else {
    if (startsWith(relativeParts.path, "/")) {
      // path is absolute
      target.path = removeDotSegment(relativeParts.path);
    } else {
      // path is relative
      target.path = removeDotSegment(mergePaths(baseParts, relativeParts.path));
    }
  }
  return formatURL(target);
};

interface ParsedURL {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
}
/**
 * Parses a URL into its components.
 * @param {string} url - The URL to parse.
 * @returns {ParsedURL} The parsed URL components.
 */
function parseURL(url: string): ParsedURL {
  const matches = url.match(urlComponentRegex);
  if (matches === null) {
    return {
      scheme: "",
      authority: "",
      path: "",
      query: "",
      fragment: "",
    };
  }

  return {
    scheme: matches[1] ?? "",
    authority: matches[2] ?? "",
    path: matches[3] ?? "",
    query: matches[4] ?? "",
    fragment: matches[5] ?? "",
  };
}
/**
 * Formats a parsed URL into a string.
 * @param {ParsedURL} parts - The parsed URL components.
 * @returns {string} The formatted URL string.
 */
function formatURL(parts: ParsedURL): string {
  let url = "";
  if (parts.scheme) {
    url += parts.scheme + ":";
  }

  if (parts.authority) {
    url += "//" + parts.authority;
  }
  url += parts.path;

  if (parts.query) {
    url += "?" + parts.query;
  }

  if (parts.fragment) {
    url += "#" + parts.fragment;
  }
  return url;
}

/**
 * Removes "." and ".." from the URL path, as described by the algorithm
 * in RFC 3986 Section 5.2.4. Remove Dot Segments
 * @param {string} path - The URL path
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.4
 * @returns The path with dot segments removed.
 * @example "/baz/booz/../biz" => "/baz/biz"
 */
function removeDotSegment(path: string): string {
  const segments = path.split(/(?=\/)/);
  const output: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment === ".." || segment === "." || segment === "") {
      continue;
    }

    if (segment === "/..") {
      output.pop();
      // if it's last segment push a trailing "/"
      if (i === segments.length - 1) {
        output.push("/");
      }
      continue;
    }
    if (segment === "/.") {
      // if it's last segment push a trailing "/"
      if (i === segments.length - 1) {
        output.push("/");
      }
      continue;
    }
    output.push(segment);
  }
  return output.join("");
}

/**
 * Merges a base URL path with a relative URL path, as described by
 * the algorithm merge paths in RFC 3986 Section 5.2.3. Merge Paths
 * @param {ParsedURL} baseParts - The parsed base URL components.
 * @param {string} relativePath - The relative URL path.
 * @returns {string} The merged URL path.
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.3
 */
function mergePaths(baseParts: ParsedURL, relativePath: string): string {
  if (baseParts.authority && baseParts.path === "") {
    return "/" + relativePath;
  }
  const basePath = baseParts.path;
  return basePath.substring(0, basePath.lastIndexOf("/") + 1) + relativePath;
}
/**
 * Resolves multiple URL segments using the RFC 3986 URL resolution algorithm.
 *
 * This function takes a variable number of URL segments and resolves them
 * sequentially according to the RFC 3986 URL resolution algorithm.
 * First argument is the base URL.
 * Empty string arguments are ignored.
 *
 * @param {...(string|undefined)} args - The URL segments to resolve.
 * @returns {string} The resolved URL as a string.
 */
export const resolveURLwithRFC3689Algo = (...args: Array<string | undefined>): string => {
  const filteredArgs = args.filter((val) => val !== "");
  const len = filteredArgs.length;
  if (len === 0) {
    return "";
  }
  if (len === 1) {
    return filteredArgs[0] ?? "";
  } else {
    const basePart = filteredArgs[0] ?? "";
    const relativeParts = filteredArgs[1] ?? "";
    const resolvedURL = _resolveURL(basePart, relativeParts);
    const remainingArgs = filteredArgs.slice(2);
    return resolveURLwithRFC3689Algo(resolvedURL, ...remainingArgs);
  }
};

const resolveURL = resolveURLwithRFC3689Algo;
export { getFilenameIndexInUrl };
export default resolveURL;
