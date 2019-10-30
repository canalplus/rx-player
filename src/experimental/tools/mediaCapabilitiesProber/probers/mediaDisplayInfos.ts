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

import PPromise from "../../../../utils/promise";
import {
  IMediaConfiguration,
  ProberStatus,
} from "../types";

/**
 * @param {Object} config
 * @returns {Promise}
 */
export default function probeMatchMedia(
  config: IMediaConfiguration
): Promise<[ProberStatus]> {
  return new PPromise((resolve) => {
    /* tslint:disable no-unbound-method */
    if (typeof window.matchMedia !== "function") {
    /* tslint:enable no-unbound-method */
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "matchMedia not available");
    }
    if (config.display == null ||
        config.display.colorSpace === undefined ||
        config.display.colorSpace.length === 0) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "Not enough arguments for calling matchMedia.");
    }

    const match = window.matchMedia(`(color-gamut: ${config.display.colorSpace})`);
    if (match.media === "not all") {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "Bad arguments for calling matchMedia.");
    }

    const result : [ProberStatus] = [
      match.matches ? ProberStatus.Supported : ProberStatus.NotSupported,
    ];
    resolve(result);
  });
}
