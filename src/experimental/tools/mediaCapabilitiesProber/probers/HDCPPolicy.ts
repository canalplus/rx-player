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
import type { IMediaConfiguration } from "../types";
import { ProberStatus } from "../types";

/**
 * @param {Object} config
 * @returns {Promise}
 */
export default function probeHDCPPolicy(
  config: IMediaConfiguration,
): Promise<[ProberStatus]> {
  if (isNullOrUndefined(eme.requestMediaKeySystemAccess)) {
    return Promise.reject("MediaCapabilitiesProber >>> API_CALL: " + "API not available");
  }
  if (isNullOrUndefined(config.hdcp)) {
    return Promise.reject(
      "MediaCapabilitiesProber >>> API_CALL: " +
        "Missing policy argument for calling getStatusForPolicy.",
    );
  }

  const hdcp = "hdcp-" + config.hdcp;
  const policy = { minHdcpVersion: hdcp };

  /**
   * These are the EME key statuses for which the playback is authorized.
   * @see https://w3c.github.io/encrypted-media/#dom-mediakeystatus
   */
  const playableStatuses: MediaKeyStatus[] = ["usable", "output-downscaled"];

  /**
   * These are the EME key statuses for which it is not possible to determine
   * whether the playback is authorized or restricted.
   * @see https://w3c.github.io/encrypted-media/#dom-mediakeystatus
   */
  const unkownStatuses: MediaKeyStatus[] = ["status-pending"];

  const keySystem = "org.w3.clearkey";
  const drmConfig = {
    initDataTypes: ["cenc"],
    audioCapabilities: [
      {
        contentType: 'audio/mp4;codecs="mp4a.40.2"',
      },
    ],
    videoCapabilities: [
      {
        contentType: 'video/mp4;codecs="avc1.42E01E"',
      },
    ],
  };

  return eme
    .requestMediaKeySystemAccess(keySystem, [drmConfig])
    .then((mediaKeysSystemAccess) => {
      return mediaKeysSystemAccess
        .createMediaKeys()
        .then((mediaKeys) => {
          if (!("getStatusForPolicy" in mediaKeys)) {
            // do the check here, as mediaKeys can be either be native MediaKeys or
            // custom MediaKeys from compat.
            throw new Error(
              "MediaCapabilitiesProber >>> API_CALL: " +
                "getStatusForPolicy API not available",
            );
          }
          return (
            mediaKeys as {
              getStatusForPolicy: (policy: {
                minHdcpVersion: string;
              }) => Promise<MediaKeyStatus>;
            }
          )
            .getStatusForPolicy(policy)
            .then((result: MediaKeyStatus) => {
              let status: [ProberStatus];
              if (playableStatuses.indexOf(result) !== -1) {
                status = [ProberStatus.Supported];
              } else if (unkownStatuses.indexOf(result) !== -1) {
                status = [ProberStatus.Unknown];
              } else {
                status = [ProberStatus.NotSupported];
              }
              return status;
            });
        })
        .catch(() => {
          const status: [ProberStatus] = [ProberStatus.Unknown];
          return status;
        });
    });
}
