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
import { is_requestMKSA_APIAvailable } from "../compatibility";

import buildKeySystemConfigurations from "./buildKeySystemConfiguration";

export interface IMediaKeySystemInfos {
  name: string;
  configuration: MediaKeySystemConfiguration[];
}

const probe = (config: IMediaConfiguration): Promise<number> => {
  return is_requestMKSA_APIAvailable().then(() => {
    const mediaProtection = config.mediaProtection;
    if (mediaProtection) {
      const drm = mediaProtection.drm;
      if (drm && drm.type) {
        const keySystem = drm.type;
        const  configuration =
          buildKeySystemConfigurations(keySystem, drm.configuration || {});

            return navigator.requestMediaKeySystemAccess(name, configuration).then(() => {
              return 2;
            }).catch(() => {
              return 0;
            });
      }
    }
    throw new Error(
      "API_CALL: Not enough arguments for calling requestMediaKeySystemAccess.");
  });
};

export default probe;
