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

import {
  ICompatTextTrack,
  ICompatVTTCue,
  MediaSource_,
} from "./browser_compatibility_types";
import * as events from "./event_listeners";

import play from "./play";
 // eslint-disable-next-line max-len
import shouldValidateMetadata from "./should_validate_metadata";
import whenLoadedMetadata$ from "./when_loaded_metadata";

 // TODO To remove. This seems to be the only side-effect done on import, which
 // we  would prefer to disallow (both for the understandability of the code and
 // to better exploit tree shaking.

export {
  events,
  ICompatTextTrack,
  ICompatVTTCue,
  MediaSource_,
  play,
  shouldValidateMetadata,
  whenLoadedMetadata$,
};

