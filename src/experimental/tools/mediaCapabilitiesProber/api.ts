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

import { canRelyOnRequestMediaKeySystemAccess } from "../../../compat/can_rely_on_request_media_key_system_access.ts";
import getEmeApiImplementation from "../../../compat/eme/index.ts";
import {
  DUMMY_PLAY_READY_HEADER,
  generatePlayReadyInitData,
} from "../../../compat/generate_init_data.ts";
import log from "./log.ts";
import probeDecodingInfos from "./probers/decodingInfo.ts";
import probeHDCPPolicy from "./probers/HDCPPolicy.ts";
import probeTypeWithFeatures from "./probers/isTypeSupportedWithFeatures.ts";
import probeContentType from "./probers/mediaContentType.ts";
import probeMatchMedia from "./probers/mediaDisplayInfos.ts";
import type {
  IDisplayConfiguration,
  IMediaConfiguration,
  IMediaKeySystemConfiguration,
} from "./types.ts";

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
    log.setLevel(level, log.getFormat());
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
   * @returns {Promise.<MediaKeySystemConfiguration>} - Resolved the
   * MediaKeySystemConfiguration actually obtained if the given configuration is
   * compatible or a rejected Promise if not.
   */
  async checkDrmConfiguration(
    keySystemType: string,
    keySystemConfiguration: IMediaKeySystemConfiguration[],
  ): Promise<MediaKeySystemConfiguration> {
    const eme = getEmeApiImplementation("auto");

    if (eme === null) {
      const error = new Error("EME not supported in current environment");
      throw error;
    }

    const mksa = await eme.requestMediaKeySystemAccess(
      keySystemType,
      keySystemConfiguration,
    );

    if (!canRelyOnRequestMediaKeySystemAccess(keySystemType)) {
      try {
        const mediaKeys = await mksa.createMediaKeys();
        const session = mediaKeys.createSession();
        const initData = generatePlayReadyInitData(DUMMY_PLAY_READY_HEADER);
        await session.generateRequest("cenc", initData);
        session.close().catch(() => {
          log.warn("MediaCapabilitiesProber", "Failed to close the dummy session");
        });
        return mksa.getConfiguration();
      } catch (err) {
        log.debug(
          "MediaCapabilitiesProber",
          "KeySystemAccess was granted but it is not usable",
        );
        return Promise.reject(
          new Error(
            "Failed to generare a license-request with this keySystem: " +
              (err instanceof Error ? err.toString() : "Unknown Error"),
          ),
        );
      }
    } else {
      return mksa.getConfiguration();
    }
  },

  /**
   * Get HDCP status. Evaluates if current equipement support given
   * HDCP revision.
   * @param {string} hdcpVersion - The wanted HDCP version to test (e.g.
   * `"1.1"`).
   * @returns {Promise.<string>} - Returns a Promise which rejects if the
   * browser API we need to rely on unexpectedly fail.
   *
   * If they resolve, resolve with one of the following string:
   *
   *   - `"Supported"`: The HDCP version is probably supported
   *
   *   - `"NotSupported"`: The HDCP version is probably not supported
   *
   *   - `"Unknown"`: It is unknown if the HDCP version may be supported or not.
   */
  async getStatusForHDCP(hdcpVersion: string): Promise<string> {
    if (hdcpVersion === undefined || hdcpVersion.length === 0) {
      throw new Error("Bad Arguments: No HDCP Policy specified.");
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
    } catch {
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
  async getDecodingCapabilities(
    mediaConfig: IMediaConfiguration,
  ): Promise<"Supported" | "Unknown" | "NotSupported"> {
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
      log.error("MediaCapabilitiesProber", "probeContentType failed", error);
    }

    try {
      const res = await probeTypeWithFeatures(config);
      if (res === "NotSupported") {
        return "NotSupported";
      }
    } catch {
      // We do not care here
    }

    try {
      const res = await probeDecodingInfos(config);
      return res;
    } catch {
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
    } catch {
      // We do not care here
    }

    try {
      const res = await probeTypeWithFeatures(config);
      if (res === "NotSupported") {
        return "NotSupported";
      }
    } catch {
      // We do not care here
    }
    return matchMediaSupported === true ? "Supported" : "Unknown";
  },
};

export default mediaCapabilitiesProber;
