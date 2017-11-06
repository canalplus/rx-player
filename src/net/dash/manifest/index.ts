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

import assert from "../../../utils/assert";
import { parseMPD } from "./parsers";
import {
  ContentProtectionParser,
  } from "../types";

import {
    IParsedManifest
  } from "../../types";

/**
 * @param {string|Document} manifest - Original manifest as returned by the
 * server. Either in string format, or in a Document Object format.
 * @param {Function} [contentProtectionParser]
 * @returns {Object} - parsed manifest
 */
const parser = function(
  manifest: string|Document,
  contentProtectionParser?: ContentProtectionParser
): IParsedManifest {
  if (typeof manifest === "string") {
    return parseFromString(manifest, contentProtectionParser);
  } else {
    return parseFromDocument(manifest, contentProtectionParser);
  }
};

/**
 * @param {Document} manifest - Original manifest as returned by the server
 * @param {Function} [contentProtectionParser]
 * @returns {Object} - parsed manifest
 */
function parseFromDocument(
  document: Document,
  contentProtectionParser?: ContentProtectionParser
): IParsedManifest {
  const root = document.documentElement;
  assert.equal(root.nodeName, "MPD", "document root should be MPD");
  return parseMPD(root, contentProtectionParser);
}

/**
 * @param {string} manifest - manifest file in a string format
 * @param {Function} [contentProtectionParser]
 * @returns {Object} - parsed manifest
 */
function parseFromString(
  manifest: string,
  contentProtectionParser?: ContentProtectionParser
): IParsedManifest {
  return parseFromDocument(
    new DOMParser().parseFromString(manifest, "application/xml"), 
    contentProtectionParser
  );
}

export {
  parseFromString,
  parseFromDocument,
};

export default parser;
