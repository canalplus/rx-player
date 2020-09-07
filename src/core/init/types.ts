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

import { ICustomError } from "../../errors";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../manifest";
import { IStalledStatus } from "../api";
import SourceBuffersStore from "../source_buffers";
import { IRepresentationChangeEvent } from "../stream";
import { IStallingItem } from "./get_stalled_events";

// Object emitted when the clock ticks
export interface IInitClockTick { currentTime : number;
                                  buffered : TimeRanges;
                                  duration : number;
                                  bufferGap : number;
                                  state : string;
                                  playbackRate : number;
                                  currentRange : { start : number;
                                                   end : number; } |
                                                 null;
                                  readyState : number;
                                  paused : boolean;
                                  stalled : IStalledStatus |
                                            null;
                                  seeking : boolean; }

// The Manifest has been downloaded and parsed for the first time
export interface IManifestReadyEvent { type : "manifestReady";
                                       value : { manifest : Manifest }; }

// The Manifest has been refreshed
export interface IManifestUpdateEvent { type: "manifestUpdate";
                                        value: null; }

// The decipherability status of at least one Manifest's Representation has been
// updated.
// This generally means that some Representation were detected to be
// undecipherable on the current device.
export interface IDecipherabilityUpdateEvent {
  type: "decipherabilityUpdate";
  value: Array<{ manifest : Manifest;
                 period : Period;
                 adaptation : Adaptation;
                 representation : Representation; }>; }

// A minor error happened
export interface IWarningEvent { type : "warning";
                                 value : ICustomError; }

// The MediaSource needs to reload (and is reloading) due to a media event
export interface IReloadingMediaSourceEvent { type: "reloading-media-source";
                                              value: undefined; }

// The current playback rate changed.
// Note: it can be a change wanted by the user or even a manual `0` speed
// setting to build a buffer.
export interface ISpeedChangedEvent { type : "speedChanged";
                                      value : number; }

// The player stalled, leading to buffering.
export interface IStalledEvent { type : "stalled";
                                 value : IStallingItem|null; }

// The content loaded and can now be played
export interface ILoadedEvent { type : "loaded";
                                value : {
                                  sourceBuffersStore: SourceBuffersStore | null;
                                }; }

export { IRepresentationChangeEvent };
