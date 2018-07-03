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

import log from "../../log";
import { IMediaConfiguration } from "../../types";

export interface IDecodingInfos {
  supported: boolean;
  smooth: boolean;
  powerEfficient: boolean;
}

/**
 * Check if the required APIs are available.
 * @returns {Promise}
 */
function isMediaCapabilitiesAPIAvailable(): Promise<void> {
  return new Promise((resolve) => {
    if (!("mediaCapabilities" in navigator)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "MediaCapabilities API not available");
    }
    if (!("decodingInfo" in (navigator as any).mediaCapabilities)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "Decoding Info not available");
    }
    resolve();
  });
}

/**
 * @param {Object} config
 * @returns {Promise}
 */
export default function probeDecodingInfos(config: IMediaConfiguration): Promise<number> {
  return isMediaCapabilitiesAPIAvailable().then(() => {
    const hasVideoConfig = (
      config.type &&
      config.video &&
      config.video.bitrate &&
      config.video.contentType &&
      config.video.framerate &&
      config.video.height &&
      config.video.width
    );

    const hasAudioConfig = (
      config.type &&
      config.audio &&
      config.audio.bitrate &&
      config.audio.channels &&
      config.audio.contentType &&
      config.audio.samplerate
    );

    if (hasVideoConfig || hasAudioConfig) {
      return (navigator as any).mediaCapabilities.decodingInfo(config)
        .then((result: IDecodingInfos) => {
          return result.supported ? 3 : 0;
        }).catch(() => {
          log.warn("MediaCapabilitiesProber >>> API_CALL: " +
            "Bad arguments for calling mediaCapabilities.");
          return 0;
        });
    }
    throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
      "Not enough arguments for calling mediaCapabilites.");
  });
}
