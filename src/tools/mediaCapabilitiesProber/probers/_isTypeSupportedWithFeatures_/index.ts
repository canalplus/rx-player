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
import { is_isTypeSupportedWithFeatures_APIAvailable } from "../compatibility";

import formatConfig from "./format";

export interface ITypeWithFeatures {
  keySystem: string;
  features: string|null;
}

export type ISupportWithFeatures = ""|"Maybe"|"Not Supported"|"Probably";

const probe = (config: IMediaConfiguration) => {
  return is_isTypeSupportedWithFeatures_APIAvailable().then(() => {
    const mediaProtection = config.mediaProtection;
    const keySystem = mediaProtection ?
      (mediaProtection.drm ?
        mediaProtection.drm.type || "org.w3.clearkey" :
        "org.w3.clearkey") :
      "org.w3.clearkey";
    const output = mediaProtection ? mediaProtection.output : undefined;

    const video = config.video;
    const audio = config.audio;
    const display = config.display;

    const features = formatConfig(video, output, audio, display);

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

    return formatSupport(result);
  });
};

export default probe;
