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

import log from "../log";
import {
  ICompatibleKeySystem,
  IDisplayConfiguration,
  IMediaConfiguration,
} from "../types";
import probeMediaConfiguration, { IBrowserAPIS } from "./probeMediaConfiguration";

/**
 * A set of API to probe media capabilites.
 * Each API allow to evalute a specific feature (HDCP support, decoding infos, etc)
 * and relies on different browser API to probe capabilites.
 */
const mediaCapabilitiesProber = {

  /**
   * Set logger level
   * @param {string} level
   */
  set LogLevel(level: string) {
    log.setLevel(level);
  },

  /**
   * Get logger level
   * @returns {string}
   */
  get LogLevel() : string {
    return log.getLevel();
  },

  /**
   * Get HDCP status. Evaluates if current equipement support given
   * HDCP revision.
   * @param {string}
   * @returns {Promise}
   */
  getStatusForHDCP(hdcp: string) : Promise<string> {
    if (!hdcp) {
      return Promise.reject("MediaCapabilitiesProbers >>> Bad Arguments: " +
        "No HDCP Policy specified.");
    }
    const config = {
      hdcp,
    };
    const browserAPIS: IBrowserAPIS[] = [
      "isTypeSupportedWithFeatures",
      "getStatusForPolicy",
    ];
    return probeMediaConfiguration(config, browserAPIS).then(({ globalStatusNumber }) => {
      switch (globalStatusNumber) {
        case 0:
          return "NotSupported";
        case 1:
          return "Unknown";
        case 2:
          return "Supported";
        default:
          return "NotSupported";
      }
    });
  },

  /**
   * Get decoding capabilities from a given video and/or audio
   * configuration.
   * @param {Object} mediaConfig
   * @returns {Promise}
   */
  getDecodingCapabilities(
    mediaConfig: IMediaConfiguration
  ) : Promise<string> {
    const config = {
      type: mediaConfig.type,
      video: mediaConfig.video,
      audio: mediaConfig.audio,
    };
    const browserAPIS: IBrowserAPIS[] = [
      "isTypeSupported",
      "isTypeSupportedWithFeatures",
      "decodingInfos",
    ];
    return probeMediaConfiguration(config, browserAPIS).then(({ globalStatusNumber }) => {
      switch (globalStatusNumber) {
        case 0:
          return "NotSupported";
        case 1:
          return "MaybeSupported";
        case 2:
          return "Supported";
        default:
          return "NotSupported";
      }
    });
  },

  /**
   * From an array of given configurations (type  and key system configuration), return
   * supported ones.
   * @param {Array.<Object>} configurations
   * @returns {Promise}
   */
  getCompatibleDRMConfigurations(
    configurations: Array<{
      type: string;
      configuration: MediaKeySystemConfiguration;
    }>
  ) : Promise<ICompatibleKeySystem[]> {
    const promises: Array<Promise<any>> = [];
    configurations.forEach((configuration) => {
      const globalConfig = {
        keySystem: configuration,
      };
      const browserAPIS: IBrowserAPIS[] = ["requestMediaKeySystemAccess"];
      promises.push(probeMediaConfiguration(globalConfig, browserAPIS)
        .then(({ globalStatusNumber, resultsFromAPIS }) => {
          const requestMediaKeySystemAccessResults = resultsFromAPIS
            .find((result) => result.APIName === "requestMediaKeySystemAccess");

          if (
            requestMediaKeySystemAccessResults == null ||
            requestMediaKeySystemAccessResults.result == null
          ) {
            throw new Error();
          }

          return {
            globalStatusNumber,
            result: requestMediaKeySystemAccessResults.result,
          };
        }));
    });
    return Promise.all(promises).then((supportedConfigs) => {
      return supportedConfigs
        .map(({ result }) => result);
    });
  },

  /**
   * Get display capabilites. Tells if display can output
   * with specific video and/or audio constrains.
   * @param {Object} displayConfig
   * @returns {Promise}
   */
  getDisplayCapabilities(
    displayConfig: IDisplayConfiguration
  ) : Promise<string> {
    const config = { display: displayConfig };
    const browserAPIS: IBrowserAPIS[] = [
      "matchMedia",
      "isTypeSupportedWithFeatures",
    ];
    return probeMediaConfiguration(config, browserAPIS).then(({ globalStatusNumber }) => {
      switch (globalStatusNumber) {
        case 0:
          return "NotSupported";
        case 1:
          return "MaybeSupported";
        case 2:
          return "Supported";
        default:
          return "NotSupported";
      }
    });
  },
};

export default mediaCapabilitiesProber;
