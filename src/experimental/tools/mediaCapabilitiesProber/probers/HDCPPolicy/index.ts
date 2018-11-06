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

import { requestMediaKeySystemAccess } from "../../../../../compat";
import { IMediaConfiguration } from "../../types";

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
export default function probeHDCPPolicy(config: IMediaConfiguration): Promise<[number]> {
  if (requestMediaKeySystemAccess == null) {
    throw new Error("API_AVAILABILITY: MediaCapabilitiesProber >>> API_CALL: " +
      "API not available");
  }
  if (!("MediaKeys" in window)) {
    throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
      "MediaKeys API not available");
  }
  if (!("getStatusForPolicy" in (window as any).MediaKeys as any)) {
    throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
      "getStatusForPolicy API not available");
  }

  if (config.hdcp == null) {
    throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
      "Missing policy argument for calling getStatusForPolicy.");
  }

  const hdcp = "hdcp-" + config.hdcp;
  const policy = { minHdcpVersion: hdcp };

  const keySystem = "w3.org.clearkey";
  const drmConfig = {
    initDataTypes: ["cenc"],
    videoCapabilities: [],
    audioCapabilities: [],
    distinctiveIdentifier: "optional" as "optional",
    persistentState: "optional" as "optional",
    sessionTypes: ["temporary"],
  };
  return requestMediaKeySystemAccess(keySystem, [drmConfig]).toPromise()
  .then((mediaKeys) => {
    return (mediaKeys as any).getStatusForPolicy(policy)
      .then((result: IMediaKeyStatus) => {
        if (result === "usable") {
          return [2];
        } else {
          return [0];
        }
      })
      .catch(() => {
        return [1];
      });
  });
}
