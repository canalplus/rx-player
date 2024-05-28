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

// Scheme part of an url (e.g. "http://").
const schemeRe = /^(?:[a-z]+:)?\/\//i;

/**
 * Simple algorithm that uses WhatWC `new URL` to resolve URL.
 * @param args
 * @returns the URL resolved with base URL and a relative reference
 */
export default function resolveURL(...args: Array<string | undefined>): string {
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
}

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

export { getFilenameIndexInUrl };
