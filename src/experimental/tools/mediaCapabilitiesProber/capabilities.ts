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

import type { ICapabilities, IMediaConfiguration } from "./types";
import { extend, filterConfigurationWithCapabilities } from "./utils";

export type ICapabilitiesTypes =
  | "decodingInfos"
  | "getStatusForPolicy"
  | "isTypeSupported"
  | "isTypeSupportedWithFeatures"
  | "matchMedia"
  | "requestMediaKeySystemAccess";

const decodingInfos: ICapabilities = [
  "type",
  {
    video: ["contentType", "width", "height", "bitrate", "framerate", "bitsPerComponent"],
  },
  {
    audio: ["contentType", "channels", "bitrate", "samplerate"],
  },
];

const getStatusForPolicy: ICapabilities = ["hdcp"];

const isTypeSupported: ICapabilities = [
  {
    video: ["contentType"],
  },
  {
    audio: ["contentType"],
  },
];

const matchMedia: ICapabilities = [
  {
    display: ["colorSpace"],
  },
];

const requestMediaKeySystemAccess: ICapabilities = [
  {
    keySystem: [
      "type",
      {
        configuration: [
          "label",
          "initDataTypes",
          "audioCapabilities",
          "videoCapabilities",
          "distinctiveIdentifier",
          "persistentState",
          "sessionTypes",
        ],
      },
    ],
  },
];

const isTypeSupportedWithFeatures: ICapabilities = [
  "type",
  {
    video: ["contentType", "width", "height", "bitrate", "framerate", "bitsPerComponent"],
  },
  {
    audio: ["contentType", "channels", "bitrate", "samplerate"],
  },
  "hdcp",
  {
    keySystem: [
      "type",
      {
        configuration: [
          "label",
          "initDataTypes",
          "audioCapabilities",
          "videoCapabilities",
          "distinctiveIdentifier",
          "persistentState",
          "sessionTypes",
        ],
      },
    ],
  },
  {
    display: ["colorSpace", "width", "height", "bitsPerComponent"],
  },
];

const capabilites: { [key: string]: ICapabilities } = {
  decodingInfos,
  getStatusForPolicy,
  isTypeSupported,
  matchMedia,
  requestMediaKeySystemAccess,
  isTypeSupportedWithFeatures,
};

/**
 * Get probed configuration.
 * @param {Object} config
 * @param {Array<string>} probers
 * @returns {Object}
 */
export default function getProbedConfiguration(
  config: IMediaConfiguration,
  probers: ICapabilitiesTypes[],
): IMediaConfiguration {
  const target: ICapabilities = [];
  extend(
    target,
    probers.map((prober) => capabilites[prober]),
  );
  return filterConfigurationWithCapabilities(target, config);
}
