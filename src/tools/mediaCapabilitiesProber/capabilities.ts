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

export type ICapabilitiesTypes =
  "_decodingInfos_" |
  "_getStatusForPolicy_" |
  "_isTypeSupported_" |
  "_isTypeSupportedWithFeatures_" |
  "_matchMedia_" |
  "_requestMediaKeySystemAccess_";

type ICapabilities = Array<(string|{ [key: string]: ICapabilities })>;

const _decodingInfos_: ICapabilities = [
  "type",
  {
    video: [
      "contentType",
      "width",
      "height",
      "bitrate",
      "framerate",
      "bitsPerComponent",
    ],
  },
  {
    audio: [
      "contentType",
      "channels",
      "bitrate",
      "samplerate",
    ],
  },
];

const _getStatusForPolicy_: ICapabilities = [
  {
    mediaProtection: [
      {
        output: [
          "hdcp",
        ],
      },
    ],
  },
];

const _isTypeSupported_: ICapabilities = [
  {
    video: [
      "contentType",
    ],
  },
  {
    audio: [
      "contentType",
    ],
  },
];

const _matchMedia_: ICapabilities = [
  {
    display: [
      "colorSpace",
    ],
  },
];

const _requestMediaKeySystemAccess_: ICapabilities = [
  {
    mediaProtection: [
      {
        drm: [
          "type",
          {
            configuration: [
              "persistentLicense",
              "persistentStateRequired",
              "distinctiveIdentifierRequired",
              "videoRobustnesses",
              "audioRobustnesses",
            ],
          },
        ],
      },
    ],
  },
];

const _isTypeSupportedWithFeatures_: ICapabilities = [
  "type",
  {
    video: [
      "contentType",
      "width",
      "height",
      "bitrate",
      "framerate",
      "bitsPerComponent",
    ],
  },
  {
    audio: [
      "contentType",
      "channels",
      "bitrate",
      "samplerate",
    ],
  },
  {
    mediaProtection: [
      {
        output: [
          "hdcp",
        ],
        drm: [
          "type",
          {
            configuration: [
              "persistentLicense",
              "persistentStateRequired",
              "distinctiveIdentifierRequired",
              "videoRobustnesses",
              "audioRobustnesses",
            ],
          },
        ],
      },
    ],
  },
  {
    display: [
      "colorSpace",
      "width",
      "height",
      "bitsPerComponent",
    ],
  },
];

const capabilites: {[key: string]: ICapabilities} = {
  _decodingInfos_,
  _getStatusForPolicy_,
  _isTypeSupported_,
  _matchMedia_,
  _requestMediaKeySystemAccess_,
  _isTypeSupportedWithFeatures_,
};

/**
 * Extends a capabilities array with others.
 * @param {Array<Object>} target
 * @param {Array<Object>} objects
 */
function extend(target: ICapabilities, objects: ICapabilities[]) {
  objects.forEach((object) => {
    object.forEach((element) => {
      if (typeof element === "string") {
        if (!target.find((targetElement) => targetElement === element)) {
          target.push(element);
        }
      } else {
        const entry = Object.entries(element)[0];
        const [ key, value ] = entry;
        const foundTargetElement = target.find((targetElement) =>
          typeof targetElement !== "string" && !!targetElement[key]);
        if (!foundTargetElement) {
          const toPush: { [key: string]: ICapabilities } = {};
          toPush[key] = extend([], [value]);
          target.push(toPush);
        } else if (typeof foundTargetElement !== "string") {
          const targetElementToExtend: {
            [key: string]: ICapabilities;
          } = foundTargetElement;
          targetElementToExtend[key] = extend(targetElementToExtend[key], [value]);
        }
      }
    });
  });
  return target;
}

export default function getProbedCapabilities(probers: ICapabilitiesTypes[]) {
  const target: ICapabilities = [];
  extend(target, probers.map((prober) => capabilites[prober]));
  return target;
}
