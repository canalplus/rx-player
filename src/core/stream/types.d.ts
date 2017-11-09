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

import { ReplaySubject } from "rxjs/ReplaySubject";

import Manifest from "../../manifest";
import Adaptation from "../../manifest/adaptation";
import ABRManager from "../abr";
import { BufferEvent } from "../buffer/types";
import { SupportedBufferTypes } from "../types";

import { IStallingItem } from "./stalling_obs";

// Object emitted when the stream's clock tick
export interface IStreamClockTick {
  currentTime : number;
  buffered : TimeRanges;
  duration : number;
  bufferGap : number;
  state : string;
  playbackRate : number;
  currentRange : { start : number, end : number }|null;
  readyState : number;
  paused : boolean;
  stalled : { state : string, timestamp : number } | null;
}

// -- Events emitted by the Stream --

export interface IAdaptationChangeEvent {
  type : "adaptationChange";
  value : {
    type : SupportedBufferTypes,
    adaptation : Adaptation|null
  };
}

export interface IManifestUpdateEvent {
  type : "manifestUpdate";
  value : {
    manifest : Manifest,
  };
}

export interface IBitrateEstimationChangeEvent {
  type : "bitrateEstimationChange";
  value : {
    type : SupportedBufferTypes,
    bitrate : number|undefined
  };
}

// Subjects given to allow a choice between the different adaptations available
export type AdaptationsSubjects =
  Record<SupportedBufferTypes, ReplaySubject<Adaptation|null>>;

export interface IManifestChangeEvent {
  type : "manifestChange";
  value : {
    manifest : Manifest,
    adaptations$ : AdaptationsSubjects,
    abrManager : ABRManager,
  };
}

export interface ISpeedChangedEvent {
  type : "speed";
  value : number;
}

export interface IStalledEvent {
  type : "stalled";
  value : IStallingItem|null;
}

export interface ILoadedEvent {
  type : "loaded";
  value : true;
}

// Every possible item emitted by the Stream
export type StreamEvent =
  IAdaptationChangeEvent |
  IManifestChangeEvent |
  IManifestUpdateEvent |
  IBitrateEstimationChangeEvent |
  ISpeedChangedEvent |
  IStalledEvent |
  ILoadedEvent |
  BufferEvent;
// XXX TODO add EME items
