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

import isNonEmptyString from "../../../utils/is_non_empty_string";

/**
 * @param {string} codecPrivateData
 * @param {string|undefined} fourCC
 * @returns {string}
 */
export function getAudioCodecs(
  codecPrivateData : string,
  fourCC?: string
) : string {
  let mpProfile : number;
  if (fourCC === "AACH") {
    mpProfile = 5; // High Efficiency AAC Profile
  } else {
    mpProfile = isNonEmptyString(codecPrivateData) ?
      (parseInt(codecPrivateData.substring(0, 2), 16) & 0xF8) >> 3 :
      2;
  }
  if (mpProfile === 0) {
    // Return default audio codec
    return "mp4a.40.2";
  }
  return `mp4a.40.${mpProfile}`;
}

/**
 * @param {string} codecPrivateData
 * @returns {string}
 */
export function getVideoCodecs(codecPrivateData : string) : string {
  // we can extract codes only if fourCC is on of "H264", "X264", "DAVC", "AVC1"
  const arr = /00000001\d7([0-9a-fA-F]{6})/.exec(codecPrivateData);
  if (arr === null || !isNonEmptyString(arr[1])) {
    // Return default video codec
    return "avc1.4D401E";
  }
  return "avc1." + arr[1];
}
