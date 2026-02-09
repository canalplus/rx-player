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

import type {
  INeedsMediaSourceReloadPayload,
  IStreamOrchestratorOptions,
  IStreamOrchestratorPlaybackObservation,
  IStreamOrchestratorCallbacks,
} from "./1-Period_selection/index.ts";
import StreamOrchestrator from "./1-Period_selection/index.ts";
import type { IPausedPlaybackObservation } from "./2-Track_selection/index.ts";
export type {
  IAdaptationChoice,
  INeedsBufferFlushPayload,
  ITrackSwitchingMode,
  IWaitingMediaSourceReloadPayload,
} from "./3-Representation_selection/index.ts";
export type {
  IRepresentationsChoice,
  IInbandEvent,
  IStreamStatusPayload,
} from "./4-Segment_selection/index.ts";

export default StreamOrchestrator;
export type {
  IPausedPlaybackObservation,
  INeedsMediaSourceReloadPayload,
  IStreamOrchestratorPlaybackObservation,
  IStreamOrchestratorOptions,
  IStreamOrchestratorCallbacks,
};
