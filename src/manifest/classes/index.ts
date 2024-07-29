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

import Track from "./adaptation";
import type { ICodecSupportInfo } from "./codec_support_cache";
import type { IDecipherabilityUpdateElement, IManifestParsingOptions } from "./manifest";
import Manifest from "./manifest";
import Period from "./period";
import Representation from "./representation";
import type {
  IMetaPlaylistPrivateInfos,
  IPrivateInfos,
  IRepresentationIndex,
  ISegment,
} from "./representation_index";
import { StaticRepresentationIndex } from "./representation_index";
import type { IBufferedChunkInfos } from "./utils";
import { areSameContent, getLoggableSegmentId } from "./utils";

export default Manifest;
export * from "./types";
export type { IPeriodsUpdateResult } from "./update_periods";
export type {
  IBufferedChunkInfos,
  ICodecSupportInfo,
  IDecipherabilityUpdateElement,
  IManifestParsingOptions,
  IMetaPlaylistPrivateInfos,
  IRepresentationIndex,
  IPrivateInfos,
  ISegment,
};
export {
  areSameContent,
  getLoggableSegmentId,
  Period,
  Track,
  Representation,
  StaticRepresentationIndex,
};
