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

import { MediaSource_ } from "../../../../../compat";
import {
  IMediaConfiguration,
  ProberStatus,
} from "../../types";

/**
 * @param {Object} config
 * @returns {Promise}
 */
export default function probeContentType(
  config: IMediaConfiguration
): Promise<[ProberStatus]> {
  return new Promise(() => {
    if (MediaSource_ == null) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "MediaSource API not available");
    }
    if (typeof MediaSource_.isTypeSupported !== "string") {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "isTypeSupported not available");
    }
    const contentTypes: string[] = [];
    if (config.video && config.video.contentType) {
      contentTypes.push(config.video.contentType);
    }
    if (config.audio && config.audio.contentType) {
      contentTypes.push(config.audio.contentType);
    }
    if (contentTypes.length === 0) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "Not enough arguments for calling isTypeSupported.");
    }
    for (let i = 0; i < contentTypes.length; i++) {
      if (!MediaSource_.isTypeSupported(contentTypes[i])) {
        return [ProberStatus.NotSupported];
      }
    }
    return [ProberStatus.Supported];
  });
}
