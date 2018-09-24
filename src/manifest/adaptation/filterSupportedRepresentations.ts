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

import { isCodecSupported } from "../../compat";
import { IRepresentationArguments } from "../representation";

/**
 * @param {string} adaptationType
 * @param {Array.<Object>} representations
 * @returns {Array.<Object>}
 */
export default function filterSupportedRepresentations(
  adaptationType : string,
  representations : IRepresentationArguments[]
) : IRepresentationArguments[] {
  if (adaptationType === "audio" || adaptationType === "video") {
    return representations
      .filter((representation) => {
        return isCodecSupported(getCodec(representation));
      });
  }
  // TODO for the other types
  return representations;

  /**
   * Construct the codec string from given codecs and mimetype.
   * @param {Object} representation
   * @returns {string}
   */
  function getCodec(
    representation : IRepresentationArguments
  ) : string {
    const { codecs = "", mimeType = "" } = representation;
    return `${mimeType};codecs="${codecs}"`;
  }
}
