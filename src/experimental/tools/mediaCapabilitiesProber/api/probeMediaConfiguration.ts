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
import getProbedConfiguration, { ICapabilitiesTypes } from "../capabilities";
import log from "../log";
import probers, {
  IResultsFromAPI,
} from "../probers";
import {
  IMediaConfiguration,
  ProberStatus,
} from "../types";

export type IBrowserAPIS =
  "isTypeSupported" |
  "isTypeSupportedWithFeatures" |
  "matchMedia" |
  "decodingInfos" |
  "requestMediaKeySystemAccess" |
  "getStatusForPolicy";

interface IProbedMediaConfiguration {
  globalStatus: ProberStatus;
  resultsFromAPIS: Array<{
    APIName: ICapabilitiesTypes;
    result?: IResultsFromAPI;
  }>;
}

/**
 * Probe media capabilities, evaluating capabilities with available browsers
 * API.
 *
 * Probe every given features with configuration.
 * If the browser API is not available OR we can't call browser API with enough
 * arguments, do nothing but warn the user (e.g. HDCP is not specified for
 * calling "getStatusForPolicy" API, "mediaCapabilites" API is not available.).
 *
 * From all API results, we return the worst state (e.g. if one API returns a
 * "Not Supported" status among other "Probably" statuses, we return
 * "Not Supported").
 *
 * @param {Object} config
 * @param {Array.<Object>} browserAPIs
 * @returns {Promise}
 */
function probeMediaConfiguration(
  config: IMediaConfiguration, browserAPIS: IBrowserAPIS[]
): Promise<IProbedMediaConfiguration> {
  let globalStatus : ProberStatus|undefined;
  const resultsFromAPIS: Array<{
    APIName: ICapabilitiesTypes;
    result?: IResultsFromAPI;
  }> = [];
  const promises = [];
  for (const browserAPI of browserAPIS) {
    const probeWithBrowser = probers[browserAPI];
    if (probeWithBrowser) {
      promises.push(probeWithBrowser(config).then(([currentStatus, result]) => {
        resultsFromAPIS.push({ APIName: browserAPI, result });

        if (globalStatus == null) {
          globalStatus = currentStatus;
        } else {
          switch (currentStatus) {
            // Here, globalStatus can't be null. Hence, if the new current status is
            // 'worse' than global status, then re-assign the latter.
            case ProberStatus.NotSupported:
              // `NotSupported` is either worse or equal.
              globalStatus = ProberStatus.NotSupported;
              break;
            case ProberStatus.Unknown:
              // `Unknown` is worse than 'Supported' only.
              if (globalStatus === ProberStatus.Supported) {
                globalStatus = ProberStatus.Unknown;
              }
              break;
            default:
              // new status is either `Supported` or unknown status. Global status
              // shouldn't be changed.
              break;
          }
        }
      }).catch((error: Error) => log.debug(error.message || error)));
    }
  }

  return PPromise.all(promises).then(() => {
      if (globalStatus == null) {
        globalStatus = ProberStatus.Unknown;
      }

      const probedCapabilities =
        getProbedConfiguration(config, resultsFromAPIS.map((a) => a.APIName));
      const areUnprobedCapabilities =
        JSON.stringify(probedCapabilities).length !== JSON.stringify(config).length;

      if (areUnprobedCapabilities && globalStatus === ProberStatus.Supported) {
        globalStatus = ProberStatus.Unknown;
      }

      if (areUnprobedCapabilities) {
        log.warn("MediaCapabilitiesProber >>> PROBER: Some capabilities " +
          "could not be probed, due to the incompatibility of browser APIs, or the " +
          "lack of arguments to call them. See debug logs for more details.");
      }

      log.info("MediaCapabilitiesProber >>> PROBER: Probed capabilities: ",
        probedCapabilities);

      return { globalStatus, resultsFromAPIS };
  });
}

export default probeMediaConfiguration;
