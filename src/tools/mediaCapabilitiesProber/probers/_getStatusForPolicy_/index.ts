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
import { is_getStatusForPolicy_APIAvailable } from "../compatibility";

export interface IPolicy {
  minHdcpVersion: string;
}

export type IMediaKeyStatus =
  "usable" |
  "expired" |
  "released" |
  "output-restricted" |
  "output-downscaled" |
  "status-pending" |
  "internal-error";

const probe = (config: IMediaConfiguration): Promise<number> => {
  return is_getStatusForPolicy_APIAvailable().then(() => {
    if (
      config.mediaProtection &&
      config.mediaProtection.output
    ) {
      const hdcp = "hdcp-" + config.mediaProtection.output.hdcp;
      const object = { minHdcpVersion: hdcp };

      const keySystem = "w3.org.clearkey";
      const drmConfig = {
        initDataTypes: ["cenc"],
        videoCapabilities: [],
        audioCapabilities: [],
        distinctiveIdentifier: "optional",
        persistentState: "optional",
        sessionTypes: ["temporary"],
      };
        return (window as any).requestMediaKeySystemAccess(keySystem, drmConfig)
          .then((mediaKeys: MediaKeys) => {
            (mediaKeys as any).getStatusForPolicy(object)
              .then((result: IMediaKeyStatus) => {
                if (result === "usable") {
                  return 2;
                } else {
                  return 0;
                }
              });
          });
    }

    throw new Error("API_CALL: Not enough arguments for calling getStatusForPolicy.");
  });
};

export default probe;
