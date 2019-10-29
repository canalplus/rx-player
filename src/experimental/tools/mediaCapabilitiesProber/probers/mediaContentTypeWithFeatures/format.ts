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

import { IMediaConfiguration } from "../../types";
import { findDefaultVideoCodec } from "../defaultCodecsFinder";

/**
 * @param {Object} config
 * @returns {string|null}
 */
export default function formatTypeSupportedWithFeaturesConfigForAPI(
  config : IMediaConfiguration
): string|null {
  const { video, audio, hdcp: outputHdcp, display } = config;
  let str: string|null = null;
  const defaultVideoCodec = findDefaultVideoCodec();
  const contentType = video === undefined ? defaultVideoCodec :
    video.contentType === undefined ? defaultVideoCodec :
                                      video.contentType;
  str = str == null ? ("" + contentType) : str;
  if (audio !== undefined && audio.contentType !== undefined) {
    const regex = /codecs="(.*?)"/;
    const match = audio.contentType.match(regex);
    if (match != null) {
      const codec = match[1];
      str = str.substring(0, str.length - 2) + "," + codec;
    }
  }
  const feat = [];

  if (video !== undefined && video.width !== undefined) {
    feat.push("decode-res-x=" + video.width.toString() + "");
  }
  if (video !== undefined && video.height !== undefined) {
    feat.push("decode-res-y=" + video.height.toString() + "");
  }
  if (video !== undefined && video.bitsPerComponent !== undefined) {
    feat.push("decode-bpc=" + video.bitsPerComponent.toString() + "");
  }
  if (video !== undefined && video.bitrate !== undefined) {
    feat.push("decode-bitrate=" + video.bitrate.toString() + "");
  }
  if (video !== undefined && video.framerate !== undefined) {
    feat.push("decode-fps=" + video.framerate + "");
  }

  if (display !== undefined) {
    if (display.width !== undefined) {
      feat.push("display-res-x=" + display.width.toString() + "");
    }
    if (display.height !== undefined) {
      feat.push("display-res-y=" + display.height.toString() + "");
    }
    if (display.bitsPerComponent !== undefined) {
      feat.push("display-bpc=" + display.bitsPerComponent.toString() + "");
    }
  }

  if (outputHdcp !== undefined) {
    const specifiedHDCPinConfig = parseFloat(outputHdcp);
    const hdcp = specifiedHDCPinConfig >= 2.2 ? 2 : 1;
    feat.push("hdcp=" + hdcp.toString());
  }
  if (feat.length > 0) {
    str +=  ";" + "features=";
    str += "\"" + feat.join(",") + "\"";
  }
  return str;
}
