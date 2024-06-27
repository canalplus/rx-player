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

import type { IMediaConfiguration } from "../types";

/**
 * Check if the required APIs are available.
 * @returns {boolean}
 */
function isMediaCapabilitiesAPIAvailable(): boolean {
  if (!("mediaCapabilities" in navigator)) {
    return false;
  }
  if (!("decodingInfo" in navigator.mediaCapabilities)) {
    return false;
  }
  return true;
}

/**
 * @param {Object} config
 * @returns {Promise}
 */
export default async function probeDecodingInfos(
  config: IMediaConfiguration,
): Promise<"Supported" | "NotSupported"> {
  if (!isMediaCapabilitiesAPIAvailable()) {
    throw new Error("navigator.mediaCapabilites.decodingInfo is not available");
  }
  const hasVideoConfig =
    config.type !== undefined &&
    config.type.length > 0 &&
    config.video !== undefined &&
    config.video.bitrate !== undefined &&
    config.video.contentType !== undefined &&
    config.video.contentType.length > 0 &&
    config.video.framerate !== undefined &&
    config.video.framerate.length > 0 &&
    config.video.height !== undefined &&
    config.video.width !== undefined;

  const hasAudioConfig =
    config.type !== undefined &&
    config.type.length > 0 &&
    config.audio !== undefined &&
    config.audio.bitrate !== undefined &&
    config.audio.channels !== undefined &&
    config.audio.channels.length > 0 &&
    config.audio.contentType !== undefined &&
    config.audio.contentType.length > 0 &&
    config.audio.samplerate !== undefined;

  if (!hasVideoConfig && !hasAudioConfig) {
    throw new Error("Not enough arguments for calling mediaCapabilites.");
  }

  try {
    const result = await navigator.mediaCapabilities.decodingInfo(
      config as unknown as MediaDecodingConfiguration,
    );
    return result.supported ? "Supported" : "NotSupported";
  } catch (err) {
    return "NotSupported";
  }
}
