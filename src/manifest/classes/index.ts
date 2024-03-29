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

import Adaptation from "./adaptation";
import Manifest, {
  IDecipherabilityUpdateElement,
  IManifestParsingOptions,
} from "./manifest";
import Period from "./period";
import Representation, { ICodecSupportList } from "./representation";
import {
  IMetaPlaylistPrivateInfos,
  IPrivateInfos,
  IRepresentationIndex,
  ISegment,
  StaticRepresentationIndex,
} from "./representation_index";
import { areSameContent, getLoggableSegmentId, IBufferedChunkInfos } from "./utils";

export default Manifest;
export * from "./types";
export { IPeriodsUpdateResult } from "./update_periods";
export {
  // utils
  areSameContent,
  getLoggableSegmentId,

  // classes
  Period,
  Adaptation,
  Representation,

  // types
  IBufferedChunkInfos,
  ICodecSupportList,
  IDecipherabilityUpdateElement,
  IManifestParsingOptions,
  IMetaPlaylistPrivateInfos,
  IRepresentationIndex,
  IPrivateInfos,
  ISegment,
  StaticRepresentationIndex,
};
