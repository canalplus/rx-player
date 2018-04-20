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
import { is_getStatusForPolicy_APIAvailable } from "../compatibility";
import probeConfigWithAPITool, { IAPITools } from "../probeConfigWithAPITools";

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

const APITools: IAPITools<IPolicy> = {
  APIisAvailable: is_getStatusForPolicy_APIAvailable,

  buildAPIArguments: (config: IMediaConfiguration): {
    args: IPolicy|null; unknownCapabilities: IMediaConfiguration;
  } => {
    const unknownCapabilities: IMediaConfiguration = JSON.parse(JSON.stringify(config));
    if (
      config.mediaProtection &&
      config.mediaProtection.output &&
      unknownCapabilities.mediaProtection &&
      unknownCapabilities.mediaProtection.output &&
      unknownCapabilities.mediaProtection.output.hdcp
    ) {
      const hdcp = "hdcp-" + config.mediaProtection.output.hdcp;
      delete unknownCapabilities.mediaProtection.output.hdcp;
      if (isEmpty(unknownCapabilities.mediaProtection.output)) {
        delete unknownCapabilities.mediaProtection.output;
      }
      if (isEmpty(unknownCapabilities.mediaProtection)) {
        delete unknownCapabilities.mediaProtection;
      }
      return { args: { minHdcpVersion: hdcp }, unknownCapabilities };
    }
    return { args: null, unknownCapabilities };
  },

  getAPIFormattedResponse: (object: IPolicy|null): Promise<number> => {
    if (object === null) {
      return Promise.reject(
        "API_CALL: Not enough arguments for calling getStatusForPolicy.");
    }
    // This config should work in any context
    const keySystem = "w3.org.clearkey";
    const config = {
      initDataTypes: ["cenc"],
      videoCapabilities: [],
      audioCapabilities: [],
      distinctiveIdentifier: "optional",
      persistentState: "optional",
      sessionTypes: ["temporary"],
    };

    return new Promise((resolve) => {
      (window as any).requestMediaKeySystemAccess(keySystem, config)
        .then((mediaKeys: MediaKeys) => {
          (mediaKeys as any).getStatusForPolicy(object)
            .then((result: IMediaKeyStatus) => {
              if (result === "usable") {
                resolve(2);
              } else {
                resolve(0);
              }
            });
        });
    });
  },
};

const probe = (config: IMediaConfiguration) => {
  return probeConfigWithAPITool(config, APITools);
};

export default probe;
