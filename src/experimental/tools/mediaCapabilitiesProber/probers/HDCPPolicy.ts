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
import {
  IMediaConfiguration,
  ProberStatus,
} from "../types";

export type IMediaKeyStatus =
  "usable" |
  "expired" |
  "released" |
  "output-restricted" |
  "output-downscaled" |
  "status-pending" |
  "internal-error";

/**
 * @param {Object} config
 * @returns {Promise}
 */
export default function probeHDCPPolicy(
  config: IMediaConfiguration
): Promise<[ProberStatus]> {

  return new PPromise((resolve) => {
    if (requestMediaKeySystemAccess == null) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "API not available");
    }
    if (config.hdcp == null) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "Missing policy argument for calling getStatusForPolicy.");
    }

    const hdcp = "hdcp-" + config.hdcp;
    const policy = { minHdcpVersion: hdcp };

    const keySystem = "org.w3.clearkey";
    const drmConfig = {
      initDataTypes: ["cenc"],
      audioCapabilities: [{
        contentType: "audio/mp4;codecs=\"mp4a.40.2\"",
      }],
      videoCapabilities: [{
        contentType: "video/mp4;codecs=\"avc1.42E01E\"",
      }],
    };

    return requestMediaKeySystemAccess(keySystem, [drmConfig]).toPromise(PPromise)
      .then((mediaKeysSystemAccess) => {
        mediaKeysSystemAccess.createMediaKeys().then((mediaKeys) => {
          if (!("getStatusForPolicy" in mediaKeys)) {
            // do the check here, as mediaKeys can be either be native MediaKeys or
            // custom MediaKeys from compat.
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
              "getStatusForPolicy API not available");
          }
          return (mediaKeys as any).getStatusForPolicy(policy)
            .then((result: IMediaKeyStatus) => {
              if (result === "usable") {
                resolve([ProberStatus.Supported]);
              } else {
                resolve([ProberStatus.NotSupported]);
              }
            });
        })
        .catch(() => {
          resolve([ProberStatus.Unknown]);
        });
      });
  });
}
