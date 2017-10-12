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

interface IParserFunctions {
  (manifest : string|Document, contentProtectionParser? : (any?) => any) : any;
  parseFromString : (string, contentProtectionParser? : (any?) => any) => any;
  parseFromDocument : (
    manifest : Document,
    contentProtectionParser? : (any?) => any
  ) => any;
}

/**
 * @param {string|Document} manifest - Original manifest as returned by the
 * server. Either in string format, or in a Document Object format.
 * @param {Function} [contentProtectionParser]
 * @returns {Object} - parsed manifest
 */
const parser = <IParserFunctions> function(manifest, contentProtectionParser) {
  if (typeof manifest === "string") {
    return parser.parseFromString(manifest, contentProtectionParser);
  } else {
    return parser.parseFromDocument(manifest, contentProtectionParser);
  }
};

/**
 * @param {Document} manifest - Original manifest as returned by the server
 * @param {Function} [contentProtectionParser]
 * @returns {Object} - parsed manifest
 */
function parseFromDocument(document, contentProtectionParser) {
  const root = document.documentElement;
  assert.equal(root.nodeName, "MPD", "document root should be MPD");
  return parseMPD(root, contentProtectionParser);
}

/**
 * @param {string} manifest - manifest file in a string format
 * @param {Function} [contentProtectionParser]
 * @returns {Object} - parsed manifest
 */
function parseFromString(manifest, contentProtectionParser) {
  return parser
    .parseFromDocument(new DOMParser().parseFromString(manifest, "application/xml"), contentProtectionParser);
}

parser.parseFromString   = parseFromString;
parser.parseFromDocument = parseFromDocument;

export {
  parseFromString,
  parseFromDocument,
};

export default parser;
