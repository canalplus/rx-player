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

import { IMediaConfiguration } from "../types";

/**
 * Check for non supported attributes in configuration.
 * If configuration is not valid, throw.
 * @param {attribute} config
 */
const checkForNonSupportedConfig = (config: IMediaConfiguration) => {
  const errorMessage = "MCP_CONF: Configuration is not supported in prober: ";
  Object.entries(config).forEach((field) => {
    const key = field[0];
    switch (key) {
      case "video":
        const videoAttributes = field[1];
        Object.entries(videoAttributes).forEach((attribute) => {
          const _key = attribute[0];
          if ([
            "contentType",
            "bitrate",
            "bitsPerComponent",
            "framerate",
            "width",
            "height",
          ].indexOf(_key) < 0) {
            throw new Error(errorMessage + _key);
          }
        });
        break;
      case "audio":
        const audioAttributes = field[1];
        Object.entries(audioAttributes).forEach((attribute) => {
          const _key = attribute[0];
          if (["contentType", "bitrate", "samplerate", "channels"].indexOf(_key) < 0) {
            throw new Error(errorMessage + _key);
          }
        });
        break;
      case "display":
        const displayAttributes = field[1];
        Object.entries(displayAttributes).forEach((attribute) => {
          const _key = attribute[0];
          if (["colorSpace", "width", "height", "bitsPerComponent"].indexOf(_key) < 0) {
            throw new Error(errorMessage + _key);
          }
        });
        break;
      case "mediaProtection":
        const mpAttributes = field[1];
        Object.entries(mpAttributes).forEach((attribute) => {
          const _key = attribute[0];
          if (["drm", "output"].indexOf(_key) < 0) {
            throw new Error(errorMessage + _key);
          }
          switch (_key) {
            case "drm":
              const drmAttributes = attribute[1];
              Object.entries(drmAttributes).forEach((_attribute) => {
                const __key = _attribute[0];
                if (["type", "configuration"].indexOf(__key) < 0) {
                  throw new Error(errorMessage + __key);
                }
                if (__key === "configuration") {
                  const configurationAttributes = _attribute[1];
                  Object.entries(configurationAttributes).forEach((__attribute) => {
                    const ___key = __attribute[0];
                    if ([
                      "persistentLicense",
                      "persistentStateRequired",
                      "distinctiveIdentifierRequired",
                      "videoRobustnesses",
                      "audioRobustnesses",
                    ].indexOf(___key) < 0) {
                      throw new Error(errorMessage + ___key);
                    }
                  });
                }
              });
              break;
            case "output":
              const outputAttributes = attribute[1];
              Object.entries(outputAttributes).forEach((_attribute) => {
                const __key = _attribute[0];
                if (["hdcp"].indexOf(__key) < 0) {
                  throw new Error(errorMessage + __key);
                }
              });
              break;
          }
        });
        break;
    }
  });
};

export default checkForNonSupportedConfig;
