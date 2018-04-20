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
import { is_matchMedia_APIAvailable } from "../compatibility";
import probeConfigWithAPITool, { IAPITools } from "../probeConfigWithAPITools";

import formatConfigFor_matchMedia_API from "./format";

const APITools: IAPITools<string> = {
  APIisAvailable: is_matchMedia_APIAvailable,

  buildAPIArguments: (object: IMediaConfiguration): {
    args: string|null; unknownCapabilities: IMediaConfiguration;
  } => {
    const unknownCapabilities = JSON.parse(JSON.stringify(object));
    if (object.display) {
      delete unknownCapabilities.display.colorSpace;
      if (isEmpty(unknownCapabilities.display)) {
        delete unknownCapabilities.display;
      }
      const format = formatConfigFor_matchMedia_API;
      const formatted = format(object.display);
      return { args: formatted, unknownCapabilities };
    }
    return { args: null, unknownCapabilities };
  },

  getAPIFormattedResponse: (object: string|null): Promise<number> => {
    if (object === null) {
      return Promise.reject("API_CALL: Not enough arguments for calling matchMedia.");
    }
    const match: MediaQueryList = window.matchMedia(object);
    const result = match.matches && match.media !== "not all" ? 2 : 0;
    return Promise.resolve(result);
  },
};

const probe = (config: IMediaConfiguration) => {
  return probeConfigWithAPITool(config, APITools);
};

export default probe;
