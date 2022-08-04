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

import resolveURL from "../../../../utils/resolve_url";
import { IBaseUrlIntermediateRepresentation } from "../node_parser_types";

export interface IResolvedBaseUrl {
  url : string;
  serviceLocation? : string | undefined;
}

/**
 * @param {Array.<string>} currentBaseURLs
 * @param {Array.<Object>} newBaseUrlsIR
 * @returns {Array.<string>}
 */
export default function resolveBaseURLs(
  currentBaseURLs : IResolvedBaseUrl[],
  newBaseUrlsIR : IBaseUrlIntermediateRepresentation[]
) : IResolvedBaseUrl[] {
  if (newBaseUrlsIR.length === 0) {
    return currentBaseURLs;
  }

  const newBaseUrls : IResolvedBaseUrl[] = newBaseUrlsIR.map(ir => {
    return { url: ir.value,
             serviceLocation: ir.attributes.serviceLocation };
  });
  if (currentBaseURLs.length === 0) {
    return newBaseUrls;
  }

  const result : IResolvedBaseUrl[] = [];
  for (let i = 0; i < currentBaseURLs.length; i++) {
    const curBaseUrl = currentBaseURLs[i];
    for (let j = 0; j < newBaseUrls.length; j++) {
      const newBaseUrl = newBaseUrls[j];
      const newUrl = resolveURL(curBaseUrl.url, newBaseUrl.url);
      result.push({ url: newUrl,
                    serviceLocation: newBaseUrl.serviceLocation ??
                                     curBaseUrl.serviceLocation });

    }
  }
  return result;
}
