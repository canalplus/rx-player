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

import { IMediaConfiguration } from "../../types";
import { is_matchMedia_APIAvailable } from "../compatibility";

import formatConfigFor_matchMedia_API from "./format";

const probe = (config: IMediaConfiguration): Promise<number> => {
  return is_matchMedia_APIAvailable().then(() => {
    if (config.display) {
      const format = formatConfigFor_matchMedia_API;
      const formatted = format(config.display);
      if (formatted) {
        const match: MediaQueryList = window.matchMedia(formatted);
        const result = match.matches && match.media !== "not all" ? 2 : 0;
        return result;
      }
    }
    throw new Error("API_CALL: Not enough arguments for calling matchMedia.");
  });
};

export default probe;
