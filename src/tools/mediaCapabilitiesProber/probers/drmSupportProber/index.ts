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
import { is_requestMKSA_APIAvailable } from "../compatibility";
import probeConfigWithAPITool, { IAPITools } from "../probeConfigWithAPITools";

import buildKeySystemConfigurations from "./buildKeySystemConfiguration";

export interface IMediaKeySystemInfos {
  name: string;
  configuration: MediaKeySystemConfiguration[];
}

const APITools: IAPITools<IMediaKeySystemInfos> = {
  APIisAvailable: is_requestMKSA_APIAvailable,

  buildAPIArguments: (object: IMediaConfiguration): {
    args: IMediaKeySystemInfos|null; unknownCapabilities: IMediaConfiguration;
  } => {
    const unknownCapabilities: IMediaConfiguration =
      JSON.parse(JSON.stringify(object));
    const mediaProtection = object.mediaProtection;
    if (mediaProtection) {
      const drm = mediaProtection.drm;
      if (drm && drm.type) {
        const keySystem = drm.type;
        const  configuration =
          buildKeySystemConfigurations(keySystem, drm.configuration || {});

        if (unknownCapabilities.mediaProtection) {
          delete unknownCapabilities.mediaProtection.drm;
          if (isEmpty(unknownCapabilities.mediaProtection)) {
            delete unknownCapabilities.mediaProtection;
          }
        }
        return { args: {
          name: keySystem,
          configuration,
        }, unknownCapabilities };
      }
    }
    return { args: null, unknownCapabilities };
  },

  getAPIFormattedResponse: (infos: IMediaKeySystemInfos|null): Promise<number> => {
    if (infos === null) {
      return Promise.reject(
        "API_CALL: Not enough arguments for calling requestMediaKeySystemAccess.");
    }
    const {
      name,
      configuration,
    } = infos;

    return new Promise((resolve) => {
      navigator.requestMediaKeySystemAccess(name, configuration).then(() => {
        resolve(2);
      }).catch(() => {
        resolve(0);
      });
    });
  },
};

const probe = (config: IMediaConfiguration) => {
  return probeConfigWithAPITool(config, APITools);
};

export default probe;
