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

import type { IFeaturesObject } from "../../features/types";
// eslint-disable-next-line max-len
import MediaSourceContentInitializer from "../../main_thread/init/media_source_content_initializer";
import mainCodecSupportProber from "../../mse/main_codec_support_prober";
import local from "../../transports/local";

function addLocalManifestFeature(features: IFeaturesObject) : void {
  features.transports.local = local;
  features.mainThreadMediaSourceInit = MediaSourceContentInitializer;
  features.codecSupportProber = mainCodecSupportProber;
}

export { addLocalManifestFeature as LOCAL_MANIFEST };
export default addLocalManifestFeature;
