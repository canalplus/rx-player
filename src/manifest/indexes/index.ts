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

const indexes : any = {};

if (__FEATURES__.SMOOTH) {
  indexes.smooth = require("./smooth.ts").default;
}
if (__FEATURES__.DASH) {
  indexes.timeline = require("./timeline.ts").default;
  indexes.template = require("./template.ts").default;
  indexes.list = require("./list.ts").default;
  indexes.base = require("./base.ts").default;
}

/**
 * Indexes have multiple "flavors" depending on the manifest concerned.
 * Here we returns the helpers best adapted to the given index.
 * @param {Object} index
 * @returns {Object|undefined}
 */
function getRightIndexHelpers(index : { indexType : string }) : any|undefined {
  return indexes[index.indexType];
}

export default getRightIndexHelpers;
