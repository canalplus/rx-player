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
import checkForNonSupportedConfig from "./checkForNonSupportedConfig";

import probers from "../probers";
import { IMediaConfiguration } from "../types";

import log from "../../../utils/log";
import filterEmptyFields from "../utils/filterEmptyFields";
import intersectCapabilities from "../utils/intersectCapabilities";
import isEmpty from "../utils/isEmpty";

type IBrowserAPIS =
  "_isTypeSupported_" |
  "_isTypeSupportedWithFeatures_" |
  "_matchMedia_" |
  "_decodingInfos_" |
  "_requestMediaKeySystemAccess_" |
  "_getStatusForPolicy_";

/**
 * Assert that configuration is valid before probing:
 * 1 - Filter empty fields.
 * 2 - Check for emptyness.
 * 3 - Check for unsupported configuration attributes.
 * @param {Object} config
 */
const validateConfiguration = (config: IMediaConfiguration) => {
  if (!config) {
    throw new Error("MCP_CONF: Configuration is not defined.");
  }
  const filteredConfig: IMediaConfiguration = filterEmptyFields(config);
  if (isEmpty(filteredConfig)) {
    throw new Error("MCP_CONF: Can't probe empty configuration.");
  }
  checkForNonSupportedConfig(filteredConfig);
  return filteredConfig;
};

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
 */
const probeMediaConfiguration =
  async (_config: IMediaConfiguration, browserAPIS: IBrowserAPIS[]) => {
    const config = validateConfiguration(_config);

    let isProbablySupported: boolean = false;
    let isMaybeSupported: boolean = false;
    let isNotSupported: boolean = false;

    let unknownCapabilities: IMediaConfiguration = JSON.parse(JSON.stringify(config));
    for (const browserAPI of browserAPIS) {
      const probeWithBrowser = probers[browserAPI];
      if (probeWithBrowser) {
        await probeWithBrowser(config)
          .then(({
            result: probeResult,
            unknownCapabilities: probeUnknownCapabilities,
          }) => {
            isNotSupported = isNotSupported || probeResult === 0;
            isMaybeSupported = isMaybeSupported || probeResult === 1;
            isProbablySupported = isProbablySupported || probeResult === 2;

            unknownCapabilities =
              intersectCapabilities(unknownCapabilities, probeUnknownCapabilities);
          }).catch((err) => {
            log.debug(err);
          });
      }
    }
    if (!isEmpty(unknownCapabilities)) {
      isMaybeSupported = true;
    }

    if (__DEV__) {
      log.debug(unknownCapabilities);
    }

    if (isNotSupported) {
      return "Not Supported";
    } else if (isMaybeSupported) {
      return "Maybe";
    } else if (isProbablySupported) {
      return "Probably";
    }
    return "Maybe";
  };

export default probeMediaConfiguration;
