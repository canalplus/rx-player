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
 * @param {string} url
 * @param {string|number} bitrate
 * @returns {string}
 */
function replaceRepresentationSmoothTokens(
    url : string,
    bitrate : string|number,
    customAttributes : string[]
  ) : string {
    return url.replace(/\{bitrate\}/g, String(bitrate))
              .replace(/{CustomAttributes}/g, customAttributes.length > 0 ?
                                                customAttributes[0] :
                                                "");
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
