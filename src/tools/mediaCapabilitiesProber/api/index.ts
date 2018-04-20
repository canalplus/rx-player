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

import {
  IDisplayConfiguration,
  IDRMConfiguration,
  IMediaConfiguration,
} from "../types";

import probeMediaConfiguration from "./probeMediaConfiguration";

import log from "../../../utils/log";

type mediaFeatures =
  "typeSupport" |
  "typeWithFeaturesSupport" |
  "mediaDisplayCapabilities" |
  "decodingCapabilities" |
  "drmSupport" |
  "HDCPPolicy";

/**
 * A set of API to probe media capabilites.
 * Each API allow to evalute a specific feature (HDCP support, decoding infos, etc)
 * and relies on different browser API to probe capabilites.
 */
const mediaCapabilitiesProber = {

  /**
   * Get capabilities for any configuration.
   * All possible attributes are accepted as argument.
   * @param {Object} config
   */
  getCapabilities: async (config: IMediaConfiguration) => {
    const features: mediaFeatures[] = [
      "typeSupport",
      "typeWithFeaturesSupport",
      "mediaDisplayCapabilities",
      "decodingCapabilities",
      "drmSupport",
      "HDCPPolicy",
    ];

    return probeMediaConfiguration(config, features);
  },

  /**
   * Get HDCP status. Evaluates if current equipement support given
   * HDCP revision.
   */
  getStatusForHDCP(hdcp: string): Promise<string> {
    if (!hdcp) {
      return Promise.reject("BAD_ARGUMENT: No HDCP Policy specified.");
    }
    const config = {
      mediaProtection: {
        output: {
          hdcp,
        },
      },
    };

    const features: mediaFeatures[] = [
      "typeWithFeaturesSupport",
      "HDCPPolicy",
    ];

    return probeMediaConfiguration(config, features);
  },

  /**
   * Get decoding capabilities from a given video and/or audio
   * configuration.
   */
  getDecodingCapabilities(config: IMediaConfiguration) {
    if (config.mediaProtection) {
      delete config.mediaProtection;
      log.info("CONF_INFO: Media Protection will not tested in that mode.");
    }
    if (config.display) {
      delete config.display;
      log.info("CONF_INFO: Display will not tested in that mode.");
    }
    const features: mediaFeatures[] = [
      "typeSupport",
      "typeWithFeaturesSupport",
      "decodingCapabilities",
    ];
    return probeMediaConfiguration(config, features);
  },

  /**
   * Get Status For DRM. Tells if browser support deciphering
   * with given drm type and configuration.
   */
  getStatusForDRM(type: string, drmConfig: IDRMConfiguration) {
    const config = {
      mediaProtection: {
        drm: {
          type,
          configuration: drmConfig,
        },
      },
    };
    const features: mediaFeatures[] = [
      "typeWithFeaturesSupport",
      "drmSupport",
    ];
    return probeMediaConfiguration(config, features);
  },

  /**
   * Get display capabilites. Tells if display can output
   * with specific video and/or audio constrains.
   */
  getDisplayCapabilities(displayConfig: IDisplayConfiguration) {
    const config = {
      display: displayConfig,
    };
    const features: mediaFeatures[] = [
      "typeWithFeaturesSupport",
      "mediaDisplayCapabilities",
    ];
    return probeMediaConfiguration(config, features);
  },
};

export default mediaCapabilitiesProber;
