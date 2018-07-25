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

 // for typings
import { Representation } from "../../../../manifest";
import { IParsedRepresentation } from "../../types";

/**
 * @param {string} url
 * @param {Representation} representation
 * @returns {string}
 */
function replaceRepresentationSmoothTokens(
    url : string,
    representation : IParsedRepresentation|Representation
  ) : string {
    return url.replace(/\{bitrate\}/g, String(representation.bitrate));
  }

/**
 * @param {string} url
 * @param {number} time
 * @returns {string}
 */
function replaceSegmentSmoothTokens(url : string, time : number) : string {
  return url.replace(/\{start time\}/g, String(time));
}

export {
  replaceRepresentationSmoothTokens,
  replaceSegmentSmoothTokens
};
