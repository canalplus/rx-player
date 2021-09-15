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

import PPromise from "../../../../utils/promise";
import {
  IMediaConfiguration,
  ProberStatus,
} from "../types";

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
  return new PPromise((resolve) => {
    if (!("mediaCapabilities" in navigator)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "MediaCapabilities API not available");
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    if (!("decodingInfo" in (navigator as any).mediaCapabilities)) {
    /* eslint-enable @typescript-eslint/no-explicit-any */
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
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
export default function probeDecodingInfos(
  config: IMediaConfiguration
): Promise<[ProberStatus]> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return isMediaCapabilitiesAPIAvailable().then(() => {
    const hasVideoConfig = (
      config.type !== undefined && config.type.length > 0 &&
      config.video !== undefined &&
      config.video.bitrate !== undefined &&
      config.video.contentType !== undefined && config.video.contentType.length > 0 &&
      config.video.framerate !== undefined && config.video.framerate.length > 0 &&
      config.video.height !== undefined &&
      config.video.width !== undefined
    );

    const hasAudioConfig = (
      config.type !== undefined && config.type.length > 0 &&
      config.audio !== undefined &&
      config.audio.bitrate !== undefined &&
      config.audio.channels !== undefined && config.audio.channels.length > 0 &&
      config.audio.contentType !== undefined && config.audio.contentType.length > 0 &&
      config.audio.samplerate !== undefined
    );

    if (!hasVideoConfig && !hasAudioConfig) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
      "Not enough arguments for calling mediaCapabilites.");
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    return (navigator as any).mediaCapabilities.decodingInfo(config)
    /* eslint-enable @typescript-eslint/no-explicit-any */
    /* eslint-enable @typescript-eslint/no-unsafe-call */
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    /* eslint-enable @typescript-eslint/no-unsafe-return */
      .then((result: IDecodingInfos) => {
        return [
          result.supported ? ProberStatus.Supported : ProberStatus.NotSupported,
        ];
      }).catch(() => {
        return [ProberStatus.NotSupported];
      });
  });
}
