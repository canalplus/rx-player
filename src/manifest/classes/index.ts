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

import Adaptation from "./adaptation.ts";
import type { ICodecSupportInfo } from "./codec_support_cache.ts";
import type { IUpdatedRepresentationInfo, IManifestParsingOptions } from "./manifest.ts";
import Manifest from "./manifest.ts";
import Period from "./period.ts";
import type { IThumbnailTrack } from "./period.ts";
import Representation from "./representation.ts";
import type { IRepresentationProtectionData } from "./representation.ts";
import type {
  IMetaPlaylistPrivateInfos,
  IPrivateInfos,
  IRepresentationIndex,
  ISegment,
} from "./representation_index/index.ts";
import { StaticRepresentationIndex } from "./representation_index/index.ts";
import type { IBufferedChunkInfos } from "./utils.ts";
import { areSameContent, getLoggableSegmentId } from "./utils.ts";

export default Manifest;
export * from "./types.ts";
export type { IPeriodsUpdateResult } from "./update_periods.ts";
export type {
  IBufferedChunkInfos,
  ICodecSupportInfo,
  IUpdatedRepresentationInfo,
  IManifestParsingOptions,
  IMetaPlaylistPrivateInfos,
  IRepresentationIndex,
  IRepresentationProtectionData,
  IPrivateInfos,
  ISegment,
  IThumbnailTrack,
};
export {
  areSameContent,
  getLoggableSegmentId,
  Period,
  Adaptation,
  Representation,
  StaticRepresentationIndex,
};
