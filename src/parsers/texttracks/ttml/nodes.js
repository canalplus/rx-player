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
 * @param {Element} tt
 * @returns {Array.<Element>}
 */
function getBodyNode(tt) {
  return tt.getElementsByTagName("body")[0];
}

/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
function getStyleNodes(tt) {
  return tt.getElementsByTagName("style");
}

/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
function getRegionNodes(tt) {
  return tt.getElementsByTagName("region");
}

/**
 * @param {Element} tt - <tt> node
 * @returns {Array.<Element>}
 */
function getTextNodes(tt) {
  return tt.getElementsByTagName("p");
}

export {
  getBodyNode,
  getStyleNodes,
  getRegionNodes,
  getTextNodes,
};
