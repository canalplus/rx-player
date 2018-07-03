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
  IDisplayConfiguration,
  IDRMConfiguration,
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
   * Get capabilities for any configuration.
   * All possible attributes are accepted as argument.
   * @param {Object} config
   * @returns {Promise}
   */
  getCapabilities: async (config: IMediaConfiguration) => {
    const browserAPIS: IBrowserAPIS[] = [
      "isTypeSupported",
      "isTypeSupportedWithFeatures",
      "matchMedia",
      "decodingInfos",
      "requestMediaKeySystemAccess",
      "getStatusForPolicy",
    ];
    return probeMediaConfiguration(config, browserAPIS);
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
    return probeMediaConfiguration(config, browserAPIS).then((result) => {
      if (result === "MaybeSupported") {
        return "Unknown";
      }
      return result;
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
    return probeMediaConfiguration(config, browserAPIS).then((result) => {
      if (result === "Probably") {
        return "Supported";
      }
      return result;
    });
  },

  /**
   * Tells if browser support deciphering with given drm type and configuration.
   * @param {string} type
   * @param {Object} drmConfig
   * @returns {Promise}
   */
  isDRMSupported(
    type: string,
    drmConfig: IDRMConfiguration
  ) : Promise<boolean> {
    const config = {
      keySystem: {
        type,
        configuration: drmConfig,
      },
    };
    const browserAPIS: IBrowserAPIS[] = ["requestMediaKeySystemAccess"];
    return probeMediaConfiguration(config, browserAPIS).then((result) => {
      return result === "Supported" ? true : false;
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
    return probeMediaConfiguration(config, browserAPIS).then((result) => {
      if (result === "Probably") {
        return "Supported";
      }
      return result;
    });
  },
};

export default mediaCapabilitiesProber;
