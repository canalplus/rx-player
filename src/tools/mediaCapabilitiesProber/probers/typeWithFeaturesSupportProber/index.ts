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

import isEmpty from "../../utils/isEmpty";

import { IMediaConfiguration } from "../../types";
import { is_isTypeSupportedWithFeatures_APIAvailable } from "../compatibility";
import probeConfigWithAPITool, { IAPITools } from "../probeConfigWithAPITools";

import formatConfig from "./format";

export interface ITypeWithFeatures {
  keySystem: string;
  features: string|null;
}

export type ISupportWithFeatures = ""|"Maybe"|"Not Supported"|"Probably";

const APITools: IAPITools<ITypeWithFeatures> = {
  APIisAvailable: is_isTypeSupportedWithFeatures_APIAvailable,

  buildAPIArguments: (object: IMediaConfiguration): {
    args: ITypeWithFeatures|null; unknownCapabilities: IMediaConfiguration;
  } => {
    const unknownCapabilities: IMediaConfiguration = JSON.parse(JSON.stringify(object));
    const mediaProtection = object.mediaProtection;
    const keySystem = mediaProtection ?
      (mediaProtection.drm ?
        mediaProtection.drm.type || "org.w3.clearkey" :
        "org.w3.clearkey") :
      "org.w3.clearkey";
    const output = mediaProtection ? mediaProtection.output : undefined;
    delete unknownCapabilities.mediaProtection;

    const video = object.video;
    const audio = object.audio;
    const display = object.display;

    delete unknownCapabilities.video;
    if (unknownCapabilities.audio) {
      delete unknownCapabilities.audio.contentType;
      if (isEmpty(unknownCapabilities.audio)) {
        delete unknownCapabilities.audio;
      }
    }
    if (unknownCapabilities.display) {
      delete unknownCapabilities.display.width;
      delete unknownCapabilities.display.height;
      delete unknownCapabilities.display.bitsPerComponent;
    }

    const features = formatConfig(video, output, audio, display);
    return { args: { keySystem, features }, unknownCapabilities };
  },

  getAPIFormattedResponse: (object: ITypeWithFeatures|null): Promise<number> => {
    if (object === null) {
      return Promise.reject(
        "API_CALL: Not enough arguments for calling isTypeSupportedWithFeatures.");
    }
    const {
      keySystem,
      features,
    } = object;

    const result =
      (window as any).MSMediaKeys.isTypeSupportedWithFeatures(keySystem, features);

    function formatSupport(support: ISupportWithFeatures) {
      if (support === "") {
        return 1;
      } else {
        switch (support) {
          case "Maybe":
            return 1;
          case "Probably":
            return 2;
          case "Not Supported":
            return 0;
          default:
            return 1;
        }
      }
    }

    return Promise.resolve(formatSupport(result));
  },
};

const probe = (config: IMediaConfiguration) => {
  return probeConfigWithAPITool(config, APITools);
};

export default probe;
