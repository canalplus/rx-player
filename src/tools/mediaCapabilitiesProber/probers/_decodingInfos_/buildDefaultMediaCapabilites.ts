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
  findDefaultAudioCodec,
  findDefaultVideoCodec,
} from "../defaultCodecsFinder";

import {
  IAudioConfiguration,
  IMediaConfiguration,
  IVideoConfiguration,
} from "../../types";

/**
 * Get default media capabilites.
 * Find video and audio codec from supported tests.
 * Then, fill config with default low values.
 * /!\ At this point, we are not sure about how these values
 * affect "support" result from some API.
 * @param config
 */
const buildDefaultMediaCapabilites = (
  config: IMediaConfiguration
): IMediaConfiguration => {
  const defaultVideoCodec = findDefaultVideoCodec();
  const defaultAudioCodec = findDefaultAudioCodec();

  const video: IVideoConfiguration = {
    contentType: config.video ?
      (config.video.contentType || defaultVideoCodec) :
      defaultVideoCodec,
    width: config.video ? (config.video.width || 720) : 720,
    height: config.video ? (config.video.height || 576) : 576,
    bitrate: config.video ? (config.video.bitrate || 700000) : 700000,
    framerate: config.video ? (config.video.framerate || "24") : "24",
    bitsPerComponent: 8,
  };

  const audio: IAudioConfiguration = {
    contentType: config.audio ?
      (config.audio.contentType || defaultAudioCodec) :
      defaultAudioCodec,
    channels: config.audio ? (config.audio.channels || "2") : "2",
    bitrate: config.audio ? (config.audio.bitrate || 96000) : 96000,
    samplerate: config.audio ? (config.audio.samplerate || 44100) : 44100,
  };

  const type = config.type || "media-source";

  return {
    video,
    audio,
    type,
  };
};

export default buildDefaultMediaCapabilites;
