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

export interface IMediaKeySystemConfiguration {
  audioCapabilities?: MediaKeySystemMediaCapability[];
  distinctiveIdentifier?: MediaKeysRequirement;
  initDataTypes?: string[];
  persistentState?: MediaKeysRequirement;
  videoCapabilities?: MediaKeySystemMediaCapability[];
  sessionTypes?: string[];
}

export interface IVideoConfiguration {
  contentType?: string;
  width?: number;
  height?: number;
  bitrate?: number;
  framerate?: string;
  bitsPerComponent?: number;
}

export interface IAudioConfiguration {
  contentType?: string;
  channels?: string;
  bitrate?: number;
  samplerate?: number;
}

export interface IMediaConfigurationKeySystem {
  type?: string;
  configuration?: IMediaKeySystemConfiguration;
}

export interface IDisplayConfiguration {
  colorSpace?: string;
  width?: number;
  height?: number;
  bitsPerComponent?: number;
}

export interface IMediaConfiguration {
  type?: "media-source" | "file" | undefined;
  video?: IVideoConfiguration | undefined;
  audio?: IAudioConfiguration | undefined;
  keySystem?: IMediaConfigurationKeySystem;
  hdcp?: string;
  display?: IDisplayConfiguration;
}
