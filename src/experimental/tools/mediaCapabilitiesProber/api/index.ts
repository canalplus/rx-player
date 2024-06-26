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

import eme from "../../../../compat/eme";
import arrayFind from "../../../../utils/array_find";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import probeHDCPPolicy from "../probers/HDCPPolicy";
import probeTypeWithFeatures from "../probers/mediaContentTypeWithFeatures";
import type {
  ICompatibleKeySystem,
  IDisplayConfiguration,
  IMediaConfiguration,
  IMediaKeySystemConfiguration,
} from "../types";
import { ProberStatus } from "../types";
import type { IBrowserAPIS } from "./probeMediaConfiguration";
import probeMediaConfiguration from "./probeMediaConfiguration";

/**
 * Probe configuration and get status from result.
 * @param {Object} config
 * @param {Array.<Object>} browserAPIS
 * @returns {Promise.<string>}
 */
function getStatusFromConfiguration(
  config: IMediaConfiguration,
  browserAPIS: IBrowserAPIS[],
): Promise<string> {
  return probeMediaConfiguration(config, browserAPIS).then(({ globalStatus }) => {
    switch (globalStatus) {
      case ProberStatus.Unknown:
        return "Unknown";
      case ProberStatus.Supported:
        return "Supported";
    }
    return "NotSupported";
  });
}

/**
 * A set of API to probe media capabilites.
 * Each API allow to evalute a specific feature (HDCP support, decoding infos, etc)
 * and relies on different browser API to probe capabilites.
 */
const mediaCapabilitiesProber = {
  /**
   * @param {string} keySystemType - Reverse domain name of the wanted key
   * system.
   * @param {Array.<MediaKeySystemConfiguration>} keySystemConfiguration - DRM
   * configuration wanted.
   * @param {Object|undefined} [options]
   * @param {number|undefined} [options.timeout] - Optional timeout in seconds,
   * after which we'll abandon the check and return a rejecting Promise.
   * @returns {Promise.<MediaKeySystemConfiguration>} - Resolved the
   * MediaKeySystemConfiguration actually obtained if the given configuration is
   * compatible or a rejected Promise if not.
   */
  async checkDrmConfiguration(
    keySystemType: string,
    keySystemConfiguration: IMediaKeySystemConfiguration[],
    options?: {
      timeout?: number | undefined;
    },
  ): Promise<MediaKeySystemConfiguration> {
    if (isNullOrUndefined(eme.requestMediaKeySystemAccess)) {
      const error = new Error("EME not supported in current environment");
      throw error;
    }

    let checkProm = eme.requestMediaKeySystemAccess(
      keySystemType,
      keySystemConfiguration,
    );

    const timeout = options?.timeout;
    if (!isNullOrUndefined(timeout)) {
      checkProm = addTimeoutToPromise(checkProm, timeout);
    }
    const mksa = await checkProm;
    return mksa.getConfiguration();
  },

  /**
   * Get HDCP status. Evaluates if current equipement support given
   * HDCP revision.
   * @param {string} hdcpVersion
   * @returns {Promise.<string>}
   */
  async getStatusForHDCP(hdcpVersion: string): Promise<string> {
    if (hdcpVersion === undefined || hdcpVersion.length === 0) {
      throw new Error("Bad Arguments: " + "No HDCP Policy specified.");
    }
    try {
      const res = await probeTypeWithFeatures({ hdcp: hdcpVersion });
      switch (res[0]) {
        case ProberStatus.NotSupported:
          return "NotSupported";
        case ProberStatus.Supported:
          return "Supported";
        case ProberStatus.Unknown:
          // continue
          break;
      }
    } catch (err) {
      // We do not care about this call erroring
    }
    return probeHDCPPolicy(hdcpVersion);
  },

  /**
   * Get decoding capabilities from a given video and/or audio
   * configuration.
   * @param {Object} mediaConfig
   * @returns {Promise}
   */
  getDecodingCapabilities(mediaConfig: IMediaConfiguration): Promise<string> {
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
    return getStatusFromConfiguration(config, browserAPIS);
  },

  /**
   * From an array of given configurations (type and key system configuration), return
   * supported ones.
   * @param {Array.<Object>} configurations
   * @returns {Promise}
   */
  getCompatibleDRMConfigurations(
    configurations: Array<{
      type: string;
      configuration: IMediaKeySystemConfiguration;
    }>,
  ): Promise<ICompatibleKeySystem[]> {
    const promises: Array<
      Promise<{
        globalStatus: ProberStatus;
        result?: ICompatibleKeySystem | undefined;
      }>
    > = [];
    configurations.forEach((configuration) => {
      const globalConfig = {
        keySystem: configuration,
      };
      const browserAPIS: IBrowserAPIS[] = ["requestMediaKeySystemAccess"];
      promises.push(
        probeMediaConfiguration(globalConfig, browserAPIS)
          .then(({ globalStatus, resultsFromAPIS }) => {
            const requestMediaKeySystemAccessResults = arrayFind(
              resultsFromAPIS,
              (result) => result.APIName === "requestMediaKeySystemAccess",
            );

            return {
              // As only one API is called, global status is
              // requestMediaKeySystemAccess status.
              globalStatus,
              result:
                requestMediaKeySystemAccessResults === undefined
                  ? undefined
                  : requestMediaKeySystemAccessResults.result,
            };
          })
          .catch(() => {
            // API couln't be called.
            return { globalStatus: ProberStatus.NotSupported };
          }),
      );
    });
    return Promise.all(promises).then((configs) => {
      // TODO I added those lines to work-around a type issue but does it
      // really correspond to the original intent? I find it hard to
      // understand and shouldn't we also rely on things like `globalStatus`
      // here?
      return configs
        .filter(
          (
            x,
          ): x is {
            globalStatus: ProberStatus;
            result: ICompatibleKeySystem;
          } => x.result !== undefined,
        )
        .map(({ result }: { result: ICompatibleKeySystem }) => result);
    });
  },

  /**
   * Get display capabilites. Tells if display can output
   * with specific video and/or audio constrains.
   * @param {Object} displayConfig
   * @returns {Promise}
   */
  getDisplayCapabilities(displayConfig: IDisplayConfiguration): Promise<string> {
    const config = { display: displayConfig };
    const browserAPIS: IBrowserAPIS[] = ["matchMedia", "isTypeSupportedWithFeatures"];
    return getStatusFromConfiguration(config, browserAPIS);
  },
};

/**
 * @param {Promise} prom
 * @param {number} timeout
 * @returns {Promise}
 */
function addTimeoutToPromise<T>(prom: Promise<T>, timeout: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutProm = new Promise<never>((_, rej) => {
    timeoutId = setTimeout(() => {
      rej(new Error("`checkDrmConfiguration` call timeouted"));
    }, timeout);
  });

  return Promise.race([timeoutProm, prom]).then((res) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    return res;
  });
}

export default mediaCapabilitiesProber;
