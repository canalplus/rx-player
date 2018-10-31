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

import { requestMediaKeySystemAccess } from "../../../../../compat/eme/MediaKeys";
import log from "../../log";
import {
  ICompatibleKeySystem,
  IMediaConfiguration
} from "../../types";

export interface IMediaKeySystemInfos {
  name: string;
  configuration: MediaKeySystemConfiguration[];
}

/**
 * @param {Object} config
 * @returns {Promise}
 */
export default function probeDRMInfos(
  mediaConfig: IMediaConfiguration
): Promise<[number, ICompatibleKeySystem?]> {
  return new Promise((resolve) => {
    if (requestMediaKeySystemAccess == null) {
      log.warn("API_AVAILABILITY: MediaCapabilitiesProber >>> API_CALL: " +
        "No API to get media key system acces.");
      // In that case, the API lack means that no EME workflow may be started.
      // So, the DRM configuration is not supported.
      resolve([0]);
    } else {
      const keySystem = mediaConfig.keySystem;
      if (keySystem) {
        if (keySystem.type) {
          const type = keySystem.type;
          const configuration = keySystem.configuration || {};
          return requestMediaKeySystemAccess(type, [configuration]).toPromise()
            .then((keySystemAccess) => {
              const keySystemConfiguration = keySystemAccess.getConfiguration();
              const result: ICompatibleKeySystem = {
                type,
                configuration,
                compatibleConfiguration: keySystemConfiguration,
              };
              resolve([2, result]);
            })
            .catch(() => {
              const result = {
                type,
                configuration,
              };
              resolve([0, result]);
            });
        }
      }
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "Not enough arguments for calling requestMediaKeySystemAccess.");
    }
  });
}
