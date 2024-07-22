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
import type { IBaseUrlIntermediateRepresentation } from "../node_parser_types";
export interface IResolvedBaseUrl {
    url: string;
    serviceLocation?: string | undefined;
}
/**
 * @param {Array.<string>} currentBaseURLs
 * @param {Array.<Object>} newBaseUrlsIR
 * @returns {Array.<string>}
 */
export default function resolveBaseURLs(currentBaseURLs: IResolvedBaseUrl[], newBaseUrlsIR: IBaseUrlIntermediateRepresentation[]): IResolvedBaseUrl[];
//# sourceMappingURL=resolve_base_urls.d.ts.map