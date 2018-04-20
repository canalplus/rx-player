
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
  IDRMConfiguration,
  IDRMInfos,
  IMediaConfiguration,
  IMediaProtectionConfiguration,
  IOutputProtectionConfiguration,
  IVideoConfiguration,
} from "../types";
import isEmpty from "../utils/isEmpty";

/**
 * From two media configurations, create the intersection.
 * @param {Object} firstConf
 * @param {Object} secondConf
 */
export default function intersectCapabilities(
  firstConf: IMediaConfiguration,
  secondConf: IMediaConfiguration
) {

  const returnConfig: IMediaConfiguration = {};

  if (firstConf.audio !== undefined && secondConf.audio !== undefined) {
    const _audio = firstConf.audio;
    const audio_ = secondConf.audio;
    const returnAudio: IAudioConfiguration = {};
    if (_audio.contentType !== undefined && audio_.contentType !== undefined) {
      returnAudio.contentType = _audio.contentType;
    }
    if (_audio.channels !== undefined && audio_.channels !== undefined) {
      returnAudio.channels = _audio.channels;
    }
    if (_audio.bitrate !== undefined && audio_.bitrate !== undefined) {
      returnAudio.bitrate = _audio.bitrate;
    }
    if (_audio.samplerate !== undefined && audio_.samplerate !== undefined) {
      returnAudio.samplerate = _audio.samplerate;
    }
    if (!isEmpty(returnAudio)) {
      returnConfig.audio = returnAudio;
    }
  }

  if (firstConf.video !== undefined && secondConf.video !== undefined) {
    const video1 = firstConf.video;
    const video2 = secondConf.video;
    const returnVideo: IVideoConfiguration = {};
    if (video1.contentType !== undefined && video2.contentType !== undefined) {
      returnVideo.contentType = video2.contentType;
    }
    if (video1.width !== undefined && video2.width !== undefined) {
      returnVideo.width = video2.width;
    }
    if (video1.height !== undefined && video2.height !== undefined) {
      returnVideo.height = video2.height;
    }
    if (video1.bitrate !== undefined && video2.bitrate !== undefined) {
      returnVideo.bitrate = video2.bitrate;
    }
    if (video1.framerate !== undefined && video2.framerate !== undefined) {
      returnVideo.framerate = video2.framerate;
    }
    if (video1.bitsPerComponent !== undefined && video2.bitsPerComponent !== undefined) {
      returnVideo.bitsPerComponent = video2.bitsPerComponent;
    }
    if (!isEmpty(returnVideo)) {
      returnConfig.video = returnVideo;
    }
  }

  if (firstConf.display && secondConf.display) {
    const display1 = firstConf.display;
    const display2 = secondConf.display;
    const returnDisplay: IDisplayConfiguration = {};
    if (display1.colorSpace !== undefined && display2.colorSpace !== undefined) {
      returnDisplay.colorSpace = display1.colorSpace;
    }
    if (display1.width !== undefined && display2.width !== undefined) {
      returnDisplay.width = display1.width;
    }
    if (display1.height !== undefined && display2.height !== undefined) {
      returnDisplay.height = display1.height;
    }
    if (
      display1.bitsPerComponent !== undefined &&
      display2.bitsPerComponent !== undefined
    ) {
      returnDisplay.bitsPerComponent = display1.bitsPerComponent;
    }
    if (!isEmpty(returnDisplay)) {
      returnConfig.display = returnDisplay;
    }
  }

  if (firstConf.mediaProtection && secondConf.mediaProtection) {
    const mediaProtection1 = firstConf.mediaProtection;
    const mediaProtection2 = secondConf.mediaProtection;
    const returnMediaProtection: IMediaProtectionConfiguration = {};
    if (mediaProtection1.drm !== undefined && mediaProtection2.drm !== undefined) {
      const drm1 = mediaProtection1.drm;
      const drm2 = mediaProtection2.drm;
      const returnDrm: IDRMInfos = {};
      if (drm1.type !== undefined && drm2.type !== undefined) {
        returnDrm.type = drm1.type;
      }
      if (drm1.configuration !== undefined && drm2.configuration !== undefined) {
        const configuration1 = drm1.configuration;
        const configuration2 = drm2.configuration;
        const returnConf: IDRMConfiguration = {};
        if (
          configuration1.persistentLicense !== undefined &&
          configuration2.persistentLicense !== undefined
        ) {
          returnConf.persistentLicense = configuration1.persistentLicense;
        }
        if (
          configuration1.persistentStateRequired !== undefined &&
          configuration2.persistentStateRequired !== undefined
        ) {
          returnConf.persistentStateRequired = configuration1.persistentStateRequired;
        }
        if (configuration1.distinctiveIdentifierRequired !== undefined &&
          configuration2.distinctiveIdentifierRequired !== undefined
        ) {
          returnConf.distinctiveIdentifierRequired =
            configuration1.distinctiveIdentifierRequired;
        }
        if (
          configuration1.videoRobustnesses !== undefined &&
          configuration2.videoRobustnesses !== undefined
        ) {
          returnConf.videoRobustnesses = configuration1.videoRobustnesses;
        }
        if (
          configuration1.audioRobustnesses !== undefined &&
          configuration2.audioRobustnesses !== undefined
        ) {
          returnConf.audioRobustnesses = configuration1.audioRobustnesses;
        }
        if (!isEmpty(returnConf)) {
          returnDrm.configuration = returnConf;
        }
      }
      if (!isEmpty(returnDrm)) {
        returnMediaProtection.drm = returnDrm;
      }
    }
    if (mediaProtection1.output !== undefined && mediaProtection2.output !== undefined) {
      const output1 = mediaProtection1.output;
      const output2 = mediaProtection2.output;
      const returnOutput: IOutputProtectionConfiguration = {};
      if (output1.hdcp !== undefined && output2.hdcp !== undefined) {
        returnOutput.hdcp = output1.hdcp;
      }
      if (!isEmpty(returnOutput)) {
        returnMediaProtection.output = returnOutput;
      }
    }
    if (!isEmpty(returnMediaProtection)) {
      returnConfig.mediaProtection = returnMediaProtection;
    }
  }

  return returnConfig;
}
