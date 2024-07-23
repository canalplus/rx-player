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
import eme from "../../../../compat/eme";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import log from "../log";
import { ProberStatus } from "../types";
/**
 * @param {Object} mediaConfig
 * @returns {Promise}
 */
export default function probeDRMInfos(mediaConfig) {
    const keySystem = mediaConfig.keySystem;
    if (isNullOrUndefined(keySystem) || isNullOrUndefined(keySystem.type)) {
        return Promise.reject("MediaCapabilitiesProber >>> API_CALL: " +
            "Missing a type argument to request a media key system access.");
    }
    const type = keySystem.type;
    const configuration = keySystem.configuration === undefined ? {} : keySystem.configuration;
    const result = { type, configuration };
    if (isNullOrUndefined(eme.requestMediaKeySystemAccess)) {
        log.debug("MediaCapabilitiesProber >>> API_CALL: " +
            "Your browser has no API to request a media key system access.");
        // In that case, the API lack means that no EME workflow may be started.
        // So, the DRM configuration is not supported.
        return Promise.resolve([ProberStatus.NotSupported, result]);
    }
    return eme
        .requestMediaKeySystemAccess(type, [configuration])
        .then((keySystemAccess) => {
        result.compatibleConfiguration = keySystemAccess.getConfiguration();
        const status = [
            ProberStatus.Supported,
            result,
        ];
        return status;
    })
        .catch(() => {
        return [ProberStatus.NotSupported, result];
    });
}
