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
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import log from "../log";
import probeDecodingInfos from "../probers/decodingInfo";
import probeHDCPPolicy from "../probers/HDCPPolicy";
import probeContentType from "../probers/mediaContentType";
import probeTypeWithFeatures from "../probers/mediaContentTypeWithFeatures";
import probeMatchMedia from "../probers/mediaDisplayInfos";
import type {
  IDisplayConfiguration,
  IMediaConfiguration,
  IMediaKeySystemConfiguration,
} from "../types";

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
  get LogLevel(): string {
    return log.getLevel();
  },

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
      switch (res) {
        case "NotSupported":
        case "Supported":
          return res;
        case "Unknown":
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
   * TODO check alongside key system.
   * @param {Object} mediaConfig
   * @returns {Promise.<string>}
   */
  async getDecodingCapabilities(mediaConfig: IMediaConfiguration): Promise<string> {
    const config = {
      type: mediaConfig.type,
      video: mediaConfig.video,
      audio: mediaConfig.audio,
    };

    let isCodecSupported = false;
    try {
      const status = probeContentType(config);
      if (status === "Supported") {
        isCodecSupported = true;
      } else if (status === "NotSupported") {
        return "NotSupported";
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      log.error("MCP: probeContentType failed", error);
    }

    try {
      const res = await probeTypeWithFeatures(config);
      if (res === "NotSupported") {
        return "NotSupported";
      }
    } catch (err) {
      // We do not care here
    }

    try {
      const res = await probeDecodingInfos(config);
      return res;
    } catch (err) {
      return isCodecSupported ? "Supported" : "Unknown";
    }
  },

  /**
   * Get display capabilites. Tells if display can output
   * with specific video and/or audio constrains.
   * TODO I'm sure there's now newer APIs we can use for this (e.g. CSS etc.)
   * @param {Object} displayConfig
   * @returns {Promise.<string>}
   */
  async getDisplayCapabilities(displayConfig: IDisplayConfiguration): Promise<string> {
    const config = { display: displayConfig };
    let matchMediaSupported: boolean | undefined;
    try {
      const status = probeMatchMedia(config);
      if (status === "Supported") {
        matchMediaSupported = true;
      } else {
        return "NotSupported";
      }
    } catch (err) {
      // We do not care here
    }

    try {
      const res = await probeTypeWithFeatures(config);
      if (res === "NotSupported") {
        return "NotSupported";
      }
    } catch (err) {
      // We do not care here
    }
    return matchMediaSupported === true ? "Supported" : "Unknown";
  },
};

/**
 * Create a new Promise from the given Promise `prom`, which rejects if the
 * amount in milliseconds defined by `timeout` has elapsed before that Promise
 * resolved.
 * @param {Promise} prom - The base promise.
 * @param {number} timeout - Maximum amount of time in milliseconds before
 * `prom` should be fullfilled.
 * @returns {Promise} - Equivalent to `prom`, which now rejects if it takes more
 * than `timeout` milliseconds to fullfil.
 */
async function addTimeoutToPromise<T>(prom: Promise<T>, timeout: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutProm = new Promise<never>((_, rej) => {
    timeoutId = setTimeout(() => {
      rej(new Error("`checkDrmConfiguration` call timeouted"));
    }, timeout);
  });

  const res = await Promise.race([timeoutProm, prom]);
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
  }
  return res;
}

export default mediaCapabilitiesProber;
