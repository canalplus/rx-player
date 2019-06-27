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

import Adaptation, {
  IAdaptationType,
  IRepresentationFilter,
  SUPPORTED_ADAPTATIONS_TYPE,
} from "./adaptation";
import Manifest, {
  IManifestParsingOptions,
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
} from "./manifest";
import Period from "./period";
import Representation from "./representation";
import IRepresentationIndex, {
  IBaseContentInfos,
  ISegment,
  StaticRepresentationIndex,
} from "./representation_index";

export default Manifest;
export {
  // classes
  Period,
  Adaptation,
  Representation,

  // types
  IAdaptationType,
  IBaseContentInfos,
  IManifestParsingOptions,
  IRepresentationFilter,
  IRepresentationIndex,
  ISegment,
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
  StaticRepresentationIndex,
  SUPPORTED_ADAPTATIONS_TYPE,
};
