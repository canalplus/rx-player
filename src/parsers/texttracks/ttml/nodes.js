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

import getLeafNodes from "./getLeafNodes.js";

/**
 * @param {Node} tt - <tt> node
 * @returns {Array.<Node>}
 */
function getStyleNodes(tt) {
  return getLeafNodes(tt.getElementsByTagName("styling")[0]);
}

/**
 * @param {Node} tt - <tt> node
 * @returns {Array.<Node>}
 */
function getRegionNodes(tt) {
  return getLeafNodes(tt.getElementsByTagName("layout")[0]);
}

/**
 * @param {Node} tt - <tt> node
 * @returns {Array.<Node>}
 */
function getTextNodes(tt) {
  return getLeafNodes(tt.getElementsByTagName("body")[0]);
}

export {
  getStyleNodes,
  getRegionNodes,
  getTextNodes,
};
