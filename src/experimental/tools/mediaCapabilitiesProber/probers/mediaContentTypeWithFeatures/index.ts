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

import PPromise from "../../../../../utils/promise";
import {
  IMediaConfiguration,
  ProberStatus,
} from "../../types";

import formatConfig from "./format";

export interface ITypeWithFeatures {
  keySystem: string;
  features: string|null;
}

export type ISupportWithFeatures = ""|"Maybe"|"Not Supported"|"Probably";

/**
 * @returns {Promise}
 */
function isTypeSupportedWithFeaturesAPIAvailable(): Promise<void> {
  return new PPromise((resolve) => {
    if (!("MSMediaKeys" in window)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "MSMediaKeys API not available");
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    if (!("isTypeSupportedWithFeatures" in (window as any).MSMediaKeys)) {
    /* eslint-enable @typescript-eslint/no-explicit-any */
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "isTypeSupportedWithFeatures not available");
    }
    resolve();
  });
}

/**
 * @param {Object} config
 * @returns {Promise}
 */
export default function probeTypeWithFeatures(
  config: IMediaConfiguration
) : Promise<[ProberStatus]> {
  return isTypeSupportedWithFeaturesAPIAvailable().then(() => {
    const keySystem = config.keySystem;

    const type = (() => {
      if (keySystem === undefined ||
          keySystem.type === undefined ||
          keySystem.type.length === 0)
      {
        return "org.w3.clearkey";
      }
      return keySystem.type;
    })();

    const features = formatConfig(config);

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const result: ISupportWithFeatures =
      (window as any).MSMediaKeys.isTypeSupportedWithFeatures(type, features);
    /* eslint-enable @typescript-eslint/no-explicit-any */
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    /* eslint-enable @typescript-eslint/no-unsafe-call */

    function formatSupport(support: ISupportWithFeatures): [ProberStatus] {
      if (support === "") {
        throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
          "Bad arguments for calling isTypeSupportedWithFeatures");
      } else {
        switch (support) {
          case "Not Supported":
            return [ProberStatus.NotSupported];
          case "Maybe":
            return [ProberStatus.Unknown];
          case "Probably":
            return [ProberStatus.Supported];
          default:
            return [ProberStatus.Unknown];
        }
      }
    }

    return formatSupport(result);
  });
}
