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

import { requestMediaKeySystemAccess } from "../../../../compat";
import PPromise from "../../../../utils/promise";
import log from "../log";
import {
  ICompatibleKeySystem,
  IMediaConfiguration,
  ProberStatus,
} from "../types";

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
): Promise<[ProberStatus, ICompatibleKeySystem?]> {
  const keySystem = mediaConfig.keySystem;
  if (keySystem == null || keySystem.type == null) {
    return PPromise.reject("MediaCapabilitiesProber >>> API_CALL: " +
      "Missing a type argument to request a media key system access.");
  }

  const type = keySystem.type;
  const configuration = keySystem.configuration === undefined ? {} :
                                                                keySystem.configuration;
  const result: ICompatibleKeySystem = { type, configuration };

  if (requestMediaKeySystemAccess == null) {
    log.debug("MediaCapabilitiesProber >>> API_CALL: " +
      "Your browser has no API to request a media key system access.");
    // In that case, the API lack means that no EME workflow may be started.
    // So, the DRM configuration is not supported.
    return PPromise.resolve([ProberStatus.NotSupported, result]);
  }

  return requestMediaKeySystemAccess(type, [configuration])
    .then((keySystemAccess) => {
      result.compatibleConfiguration = keySystemAccess.getConfiguration();
      const status : [ProberStatus, ICompatibleKeySystem?] =
        [ProberStatus.Supported, result];
      return status;
    })
    .catch(() => {
      return [ProberStatus.NotSupported, result];
    });
}
