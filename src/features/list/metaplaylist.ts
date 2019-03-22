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

import overlayBuffer from "../../core/source_buffers/overlay";
import overlayParser from "../../parsers/overlay/metaplaylist";
import metaplaylist from "../../transports/metaplaylist";
import { IFeaturesObject } from "../types";

function addMetaPlaylistFeature(features: IFeaturesObject) {
  features.transports.metaplaylist = metaplaylist;
  features.overlayBuffer = overlayBuffer;
  features.overlayParsers.metaplaylist = overlayParser;
}

export { addMetaPlaylistFeature as METAPLAYLIST };
export default addMetaPlaylistFeature;
