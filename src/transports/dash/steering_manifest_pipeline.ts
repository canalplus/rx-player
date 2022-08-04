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

import { ISteeringManifest } from "../../parsers/SteeringManifest";
/* eslint-disable-next-line max-len */
import parseDashContentSteeringManifest from "../../parsers/SteeringManifest/DCSM/parse_dcsm";
import request from "../../utils/request";
import { CancellationSignal } from "../../utils/task_canceller";
import { IRequestedData } from "../types";

/**
 * Loads DASH's Content Steering Manifest.
 * @param {string|null} url
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export async function loadSteeringManifest(
  url : string,
  cancelSignal : CancellationSignal
) : Promise<IRequestedData<string>> {
  return request({ url,
                   responseType: "text",
                   cancelSignal });
}

/**
 * Parses DASH's Content Steering Manifest.
 * @param {Object} loadedSegment
 * @param {Function} onWarnings
 * @returns {Object}
 */
export function parseSteeringManifest(
  { responseData } : IRequestedData<unknown>,
  onWarnings : (warnings : Error[]) => void
) : ISteeringManifest {
  if (
    typeof responseData !== "string" &&
    (typeof responseData !== "object" || responseData === null)
  ) {
    throw new Error("Invalid loaded format for DASH's Content Steering Manifest.");
  }

  const parsed = parseDashContentSteeringManifest(responseData);
  if (parsed[1].length > 0) {
    onWarnings(parsed[1]);
  }
  return parsed[0];
}
