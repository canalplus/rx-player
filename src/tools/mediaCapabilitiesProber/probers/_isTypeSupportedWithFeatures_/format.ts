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

import {
  IAudioConfiguration,
  IDisplayConfiguration,
  IOutputProtectionConfiguration,
  IVideoConfiguration,
} from "../../types";
import { findDefaultVideoCodec } from "../defaultCodecsFinder";

const formatConfigForAPI = (
  video?: IVideoConfiguration,
  outputProtection?: IOutputProtectionConfiguration,
  audio?: IAudioConfiguration,
  display?: IDisplayConfiguration
): string|null => {
  let str: string|null = null;
  const defaultVideoCodec = findDefaultVideoCodec();
  const contentType = video ?
    video.contentType || defaultVideoCodec :
    defaultVideoCodec;
  str = str || "" + contentType;
  if (audio && audio.contentType) {
    const regex = /codecs="(.*?)"/;
    const match = audio.contentType.match(regex);
    if (match) {
      const codec = match[1];
      str = str.substring(0, str.length - 2) + "," + codec;
    }
  }
  const feat = [];

  if (video && video.width) {
    feat.push("decode-res-x=" + video.width + "");
  }
  if (video && video.height) {
    feat.push("decode-res-y=" + video.height + "");
  }
  if (video && video.bitsPerComponent) {
    feat.push("decode-bpc=" + video.bitsPerComponent + "");
  }
  if (video && video.bitrate) {
    feat.push("decode-bitrate=" + video.bitrate + "");
  }
  if (video && video.framerate) {
    feat.push("decode-fps=" + video.framerate + "");
  }

  if (display) {
    if (display.width) {
      feat.push("display-res-x=" + display.width + "");
    }
    if (display.height) {
      feat.push("display-res-y=" + display.height + "");
    }
    if (display.bitsPerComponent) {
      feat.push("display-bpc=" + display.bitsPerComponent + "");
    }
  }

  if (outputProtection && outputProtection.hdcp) {
    const specifiedHDCPinConfig = parseFloat(outputProtection.hdcp);
    const hdcp = specifiedHDCPinConfig >= 2.2 ? 2 : 1;
    feat.push("hdcp=" + hdcp);
  }
  if (feat.length > 0) {
    str +=  ";" + "features=";
    str += "\"" + feat.join(",") + "\"";
  }
  return str;
};

export default formatConfigForAPI;
