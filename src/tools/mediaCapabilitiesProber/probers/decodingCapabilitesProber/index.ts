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

import isEmpty from "../../utils/isEmpty";

import { IMediaConfiguration } from "../../types";
import { is_mediaCapabilities_APIAvailable } from "../compatibility";
import probeConfigWithAPITool, { IAPITools } from "../probeConfigWithAPITools";
import buildDefaultMediaCapabilites from "./buildDefaultMediaCapabilites";

export interface IDecodingInfos {
  supported: boolean;
  smooth: boolean;
  powerEfficient: boolean;
}

const APITools: IAPITools<IMediaConfiguration> = {

  APIisAvailable: is_mediaCapabilities_APIAvailable,

  buildAPIArguments: (object: IMediaConfiguration): {
    args: IMediaConfiguration|null; unknownCapabilities: IMediaConfiguration;
  } => {
    const unknownCapabilities: IMediaConfiguration =
      JSON.parse(JSON.stringify(object));

    if (!object.video && !object.audio && !object.type) {
      return { args: null, unknownCapabilities };
    }

    const mediaCapabilitiesConfig = buildDefaultMediaCapabilites(object);

    delete unknownCapabilities.audio;
    delete unknownCapabilities.type;
    if (unknownCapabilities.video) {
      delete unknownCapabilities.video.contentType;
      delete unknownCapabilities.video.width;
      delete unknownCapabilities.video.height;
      delete unknownCapabilities.video.framerate;
      delete unknownCapabilities.video.bitrate;
      if (isEmpty(unknownCapabilities.video)) {
        delete unknownCapabilities.video;
      }
    }

    return { args: mediaCapabilitiesConfig, unknownCapabilities };
  },

  getAPIFormattedResponse: (object: IMediaConfiguration|null): Promise<number> => {
    if (object === null) {
      return Promise.reject(
        "API_CALL: Not enough arguments for calling mediaCapabilites.");
    }
    return new Promise((resolve, reject) => {
      (navigator as any).mediaCapabilities.decodingInfo(object)
        .then((result: IDecodingInfos) => {
          resolve(result.supported ? 2 : 0);
        }).catch(() => reject("API_CALL: Bad arguments for calling mediaCapabilities."));
    });
  },
};

const probe = (config: IMediaConfiguration) => {
  return probeConfigWithAPITool(config, APITools);
};

export default probe;
