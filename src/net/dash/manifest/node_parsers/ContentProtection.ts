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

import {
  parseScheme,
} from "../helpers";

export interface IParsedContentProtection {
  schemeIdUri?: string;
  value?: string;
}

export type IContentProtectionParser =
  (attributes: IParsedContentProtection, root: Node) => IParsedContentProtection;

/**
 * Parse the "ContentProtection" node of a MPD.
 * @param {Node} root
 * @param {Function} [contentProtectionParser]
 * @returns {Object}
 */
export default function parseContentProtection(
  root: Node,
  contentProtectionParser?: IContentProtectionParser
) : IParsedContentProtection|undefined {
  if (contentProtectionParser) {
    return contentProtectionParser(parseScheme(root), root);
  }
}
