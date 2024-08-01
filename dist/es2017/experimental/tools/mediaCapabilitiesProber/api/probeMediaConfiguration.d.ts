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
import type { ICapabilitiesTypes } from "../capabilities";
import type { IResultsFromAPI } from "../probers";
import type { IMediaConfiguration } from "../types";
import { ProberStatus } from "../types";
export type IBrowserAPIS = "isTypeSupported" | "isTypeSupportedWithFeatures" | "matchMedia" | "decodingInfos" | "requestMediaKeySystemAccess" | "getStatusForPolicy";
export interface IProbedMediaConfiguration {
    globalStatus: ProberStatus;
    resultsFromAPIS: Array<{
        APIName: ICapabilitiesTypes;
        result?: IResultsFromAPI | undefined;
    }>;
}
/**
 * Probe media capabilities, evaluating capabilities with available browsers
 * API.
 *
 * Probe every given features with configuration.
 * If the browser API is not available OR we can't call browser API with enough
 * arguments, do nothing but warn the user (e.g. HDCP is not specified for
 * calling "getStatusForPolicy" API, "mediaCapabilites" API is not available.).
 *
 * From all API results, we return the worst state (e.g. if one API returns a
 * "Not Supported" status among other "Probably" statuses, we return
 * "Not Supported").
 *
 * @param {Object} config
 * @param {Array.<Object>} browserAPIS
 * @returns {Promise}
 */
declare function probeMediaConfiguration(config: IMediaConfiguration, browserAPIS: IBrowserAPIS[]): Promise<IProbedMediaConfiguration>;
export default probeMediaConfiguration;
//# sourceMappingURL=probeMediaConfiguration.d.ts.map