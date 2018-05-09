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

import probeFromDecodingConfig from "./_decodingInfos_";
import probeFromHDCPPolicyConfig from "./_getStatusForPolicy_";
import probeFromContentType from "./_isTypeSupported_";
import probeFromTypeAndFeatures from "./_isTypeSupportedWithFeatures_";
import probeFromMediaDisplayConfig from "./_matchMedia_";
import probeFromDRMInfos from "./_requestMediaKeySystemAccess_";

import { IMediaConfiguration } from "../types";

const probers: {
  [id: string]: (config: IMediaConfiguration) => Promise<number>;
} = {
  _isTypeSupported_: probeFromContentType,
  _isTypeSupportedWithFeatures_: probeFromTypeAndFeatures,
  _matchMedia_: probeFromMediaDisplayConfig,
  _decodingInfos_: probeFromDecodingConfig,
  _requestMediaKeySystemAccess_: probeFromDRMInfos,
  _getStatusForPolicy_: probeFromHDCPPolicyConfig,
};

export default probers;
