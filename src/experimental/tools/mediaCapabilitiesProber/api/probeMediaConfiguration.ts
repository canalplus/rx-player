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

import getProbedConfiguration, { ICapabilitiesTypes } from "../capabilities";
import log from "../log";
import probers from "../probers";
import { IMediaConfiguration } from "../types";

export type IBrowserAPIS =
  "isTypeSupported" |
  "isTypeSupportedWithFeatures" |
  "matchMedia" |
  "decodingInfos" |
  "requestMediaKeySystemAccess" |
  "getStatusForPolicy";

/**
 * Probe media capabilities, evaluating capabilities with available browsers API.
 *
 * Probe every given features with configuration.
 * If the browser API is not available OR we can't call browser API with enough arguments,
 * do nothing but warn user (e.g. HDCP is not specified for calling "getStatusForPolicy"
 * API, "mediaCapabilites" API is not available.).
 *
 * if we call the browser API, we get from it a number which means:
 * - 0 : Probably
 * - 1 : Maybe
 * - 2 : Not Supported
 *
 * From all API results, we return worst of states (e.g. if one API returns
 * "Not Supported" among "Probably" statuses, return "Not Supported").
 *
 * If no API was called or some capabilites could not be probed and status is "Probably",
 * return "Maybe".
 * @param {Object} config
 * @param {Array.<Object>} browserAPIs
 * @returns {Promise}
 */
async function probeMediaConfiguration(
  config: IMediaConfiguration,
  browserAPIS: IBrowserAPIS[]
): Promise<number> {

  let statusNumber = Infinity;

  const resultingAPI: ICapabilitiesTypes[] = [];
  const promises = [];
  for (const browserAPI of browserAPIS) {
    const probeWithBrowser = probers[browserAPI][0];
    const wantedLogLevel = probers[browserAPI][1];
    if (probeWithBrowser) {
      promises.push(probeWithBrowser(config).then((probeResult) => {
        resultingAPI.push(browserAPI);
        statusNumber = Math.min(statusNumber, probeResult);
      }).catch((err) => {
        switch (wantedLogLevel) {
          case "warn":
            log.warn(err);
            break;
          case "debug":
            log.debug(err);
            break;
          case "info":
            log.info(err);
            break;
          case "error":
            log.error(err);
            break;
          default:
            log.debug(err);
            break;
        }
      }));
    }
  }

  await Promise.all(promises);

  const probedCapabilities = getProbedConfiguration(config, resultingAPI);
  const areUnprobedCapabilities =
    JSON.stringify(probedCapabilities).length !== JSON.stringify(config).length;

  statusNumber = Math.min((areUnprobedCapabilities ? 1 : Infinity), statusNumber);

  if (areUnprobedCapabilities) {
    log.warn("MediaCapabilitiesProber >>> PROBER: Some capabilities could not " +
      "be probed, due to the incompatibility of browser APIs, or the lack of arguments " +
      "to call them. (See DEBUG logs for details)");
  }

  log.info("MediaCapabilitiesProber >>> PROBER: Probed capabilities: ",
    probedCapabilities);

  return statusNumber;
}

export default probeMediaConfiguration;
