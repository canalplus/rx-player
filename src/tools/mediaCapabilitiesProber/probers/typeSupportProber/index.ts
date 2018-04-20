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
import { is_isTypeSupported_Available } from "../compatibility";
import probeConfigWithAPITool, { IAPITools } from "../probeConfigWithAPITools";

const APITools: IAPITools<string[]> = {
  APIisAvailable: is_isTypeSupported_Available,

  buildAPIArguments: (object: IMediaConfiguration): {
    args: string[]|null; unknownCapabilities: IMediaConfiguration;
  } => {
    const unknownCapabilities: IMediaConfiguration = JSON.parse(JSON.stringify(object));
    const contentTypes = [];
    if (
      unknownCapabilities.video &&
      object.video &&
      object.video.contentType
    ) {
      contentTypes.push(object.video.contentType);
      delete unknownCapabilities.video.contentType;
      if (isEmpty(unknownCapabilities.video)) {
        delete unknownCapabilities.video;
      }
    }
    if (
      unknownCapabilities.audio &&
      object.audio &&
      object.audio.contentType
    ) {
      contentTypes.push(object.audio.contentType);
      delete unknownCapabilities.audio.contentType;
      if (isEmpty(unknownCapabilities.audio)) {
        delete unknownCapabilities.audio;
      }
    }
    return { args: contentTypes, unknownCapabilities };
  },

  getAPIFormattedResponse: (object: string[]|null): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (object === null || !object.length) {
        return reject("API_CALL: Not enough arguments for calling isTypeSupported.");
      }
      const result = object.reduce((acc, val) => {
        const support = (window as any).MediaSource.isTypeSupported(val) ? 2 : 0;
        return Math.min(acc, support);
      }, 2);
      return resolve(result);
    });
  },
};

const probe = (config: IMediaConfiguration) => {
  return probeConfigWithAPITool(config, APITools);
};

export default probe;
