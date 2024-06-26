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

import globalScope from "../../../../../utils/global_scope";
import type { IMediaConfiguration } from "../../types";
import { ProberStatus } from "../../types";

import formatConfig from "./format";

export interface ITypeWithFeatures {
  keySystem: string;
  features: string | null;
}

export type ISupportWithFeatures = "" | "Maybe" | "Not Supported" | "Probably";

type IGlobalScopeWithMSMediaKeysFeatures = typeof globalScope & {
  MSMediaKeys: {
    isTypeSupportedWithFeatures: (
      type: string,
      features: string | null,
    ) => ISupportWithFeatures;
  };
};

/**
 * @returns {boolean}
 */
function isTypeSupportedWithFeaturesAPIAvailable(): boolean {
  if (!("MSMediaKeys" in globalScope)) {
    // MSMediaKeys API not available
    return false;
  }
  if (
    !(
      "isTypeSupportedWithFeatures" in
      (globalScope as IGlobalScopeWithMSMediaKeysFeatures).MSMediaKeys
    )
  ) {
    // isTypeSupportedWithFeatures not available
    return false;
  }
  return true;
}

/**
 * Rely on `MSMediaKeys`-only API `isTypeSupportedWithFeatures` to check for
 * several potential features.
 * @param {Object} config
 * @returns {Promise}
 */
/* eslint-disable-next-line @typescript-eslint/require-await */
export default async function probeTypeWithFeatures(
  config: IMediaConfiguration,
): Promise<[ProberStatus]> {
  if (!isTypeSupportedWithFeaturesAPIAvailable()) {
    throw new Error("MSMediaKeys.isTypeSupportedWithFeatures is not available");
  }
  const keySystem = config.keySystem;

  const type = (() => {
    if (
      keySystem === undefined ||
      keySystem.type === undefined ||
      keySystem.type.length === 0
    ) {
      return "org.w3.clearkey";
    }
    return keySystem.type;
  })();

  const features = formatConfig(config);

  const result: ISupportWithFeatures = (
    globalScope as IGlobalScopeWithMSMediaKeysFeatures
  ).MSMediaKeys.isTypeSupportedWithFeatures(type, features);

  function formatSupport(support: ISupportWithFeatures): [ProberStatus] {
    if (support === "") {
      throw new Error(
        "MediaCapabilitiesProber >>> API_CALL: " +
          "Bad arguments for calling isTypeSupportedWithFeatures",
      );
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
}
