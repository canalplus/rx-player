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
import { IPolicy } from "./_getStatusForPolicy_";
import { ITypeWithFeatures } from "./_isTypeSupportedWithFeatures_";
import { IMediaKeySystemInfos } from "./_requestMediaKeySystemAccess_";

type proberInnerTypes =
  string |
  string[] |
  IPolicy |
  IMediaConfiguration |
  IMediaKeySystemInfos |
  ITypeWithFeatures;

export interface IAPITools<T> {
  APIisAvailable: () => Promise<{}>;
  buildAPIArguments: (args: IMediaConfiguration) => {
      args: T|null;
  };
  getAPIFormattedResponse: (object: T|null) => Promise<number>;
}

/**
 * Evalute if configuration is supported over a specific API.
 * @param {Object} config
 * @param {function} APIisAvailable
 * @param {function} buildAPIArguments
 * @param {function} getAPIFormattedResponse
 */
async function probeConfigWithAPITool<T extends proberInnerTypes>(
  config: IMediaConfiguration,
  APITools: IAPITools<T>
): Promise<{ result: number }> {
  await APITools.APIisAvailable();
  const { args } = APITools.buildAPIArguments(config);
  const result = await APITools.getAPIFormattedResponse(args);
  return { result };
}

export default probeConfigWithAPITool;
