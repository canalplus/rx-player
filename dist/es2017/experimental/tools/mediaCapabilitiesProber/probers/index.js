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
import probeFromDecodingConfig from "./decodingInfo";
import probeFromDRMInfos from "./DRMInfos";
import probeFromHDCPPolicy from "./HDCPPolicy";
import probeFromMediaContentType from "./mediaContentType";
import probeFromMediaContentTypeWithFeatures from "./mediaContentTypeWithFeatures";
import probeFromMediaDisplayInfos from "./mediaDisplayInfos";
const probers = {
    isTypeSupported: probeFromMediaContentType,
    isTypeSupportedWithFeatures: probeFromMediaContentTypeWithFeatures,
    matchMedia: probeFromMediaDisplayInfos,
    decodingInfos: probeFromDecodingConfig,
    requestMediaKeySystemAccess: probeFromDRMInfos,
    getStatusForPolicy: probeFromHDCPPolicy,
};
export default probers;
