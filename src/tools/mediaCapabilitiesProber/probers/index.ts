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

import decodingCapabilitiesProber from "./decodingCapabilitesProber";
import drmSupportProber from "./drmSupportProber";
import HDCPPolicyProber from "./HDCPPolicyProber";
import mediaDisplayCapabilitiesProber from "./mediaDisplayCapabilitiesProber";
import typeSupportProber from "./typeSupportProber";
import typeWithFeaturesSupportProber from "./typeWithFeaturesSupportProber";

import { IMediaConfiguration } from "../types";

const probers: {
  [id: string]: (config: IMediaConfiguration) => Promise<{
    result: number;
    unknownCapabilities: IMediaConfiguration;
  }>;
} = {
  typeSupport: typeSupportProber,
  typeWithFeaturesSupport: typeWithFeaturesSupportProber,
  mediaDisplayCapabilities: mediaDisplayCapabilitiesProber,
  decodingCapabilities: decodingCapabilitiesProber,
  drmSupport: drmSupportProber,
  HDCPPolicy: HDCPPolicyProber,
};

export default probers;
