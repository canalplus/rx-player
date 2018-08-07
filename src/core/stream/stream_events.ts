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

import { Subject } from "rxjs";
import { ICustomError } from "../../errors";
import Manifest, {
  Adaptation,
  Period,
} from "../../manifest";
import ABRManager from "../abr";
import {
  IAdaptationBufferEvent,
  IRepresentationChangeEvent,
} from "../buffer";
import { IBufferType } from "../source_buffers";
import { IStallingItem } from "./stalling_manager";

// Emit when the buffer from last period is full
export interface ICompletedBufferEvent {
  type: "complete-buffer";
  value : {
    type: IBufferType;
  };
}

// Emit when the adaptation chosen for a type changes
export interface IAdaptationChangeEvent {
  type : "adaptationChange";
  value : {
    type : IBufferType;
    period : Period;
    adaptation : Adaptation|null;
  };
}

// Emit when the manifest has been downloaded and parsed
export interface IManifestReadyEvent {
  type : "manifestReady";
  value : {
    abrManager : ABRManager;
    manifest : Manifest;
  };
}

// Emit when a warning was arised
export interface IStreamWarningEvent {
  type : "warning";
  value : Error|ICustomError;
}

// Emit when the manifest has been refreshed
export interface IManifestUpdateEvent {
  type : "manifestUpdate";
  value : {
    manifest : Manifest;
  };
}

// Emit when the speed of the stream has been updated
export interface ISpeedChangedEvent {
  type : "speed";
  value : number;
}

// Emit when the global buffer is stucked
export interface IStalledEvent {
  type : "stalled";
  value : IStallingItem|null;
}

// Emit when the stream has been loaded
export interface IStreamLoadedEvent {
  type : "loaded";
  value : true;
}

// Emit when the Period being played changes
export interface IActivePeriodChangedEvent {
  type: "activePeriodChanged";
  value : {
    period: Period;
  };
}

// Emit when a new Period is ready to be played for a type of buffer
export interface IPeriodBufferReadyEvent {
  type : "periodBufferReady";
  value : {
    type : IBufferType;
    period : Period;
    adaptation$ : Subject<Adaptation|null>;
  };
}

// Emit when a previous Period is cleared for a type of buffer
export interface IPeriodBufferClearedEvent {
  type : "periodBufferCleared";
  value : {
    type : IBufferType;
    period : Period;
  };
}

// Emit when the end of stream is reached (all buffers are complete)
export interface IEndOfStreamEvent {
  type: "end-of-stream";
  value: undefined;
}

// Emit when the stream is resuming (from start/an end of stream)
export interface IResumeStreamEvent {
  type: "resume-stream";
  value: undefined;
}

// Emit just after content is loaded, with informations about playback
export interface IInitialPlaybackEvent {
  type: "initialPlayback";
  value: {
    autoPlayStatus?: "allowed"|"blocked";
  };
}

function adaptationChange(
  bufferType : IBufferType,
  adaptation : Adaptation|null,
  period : Period
) : IAdaptationChangeEvent {
  return {
    type: "adaptationChange",
    value : {
      type: bufferType,
      adaptation,
      period,
    },
  };
}

function loaded() : IStreamLoadedEvent {
  return {
    type: "loaded",
    value: true,
  };
}

function stalled(stalling : IStallingItem|null) : IStalledEvent {
  return {
    type: "stalled",
    value: stalling,
  };
}

function manifestReady(
  abrManager : ABRManager,
  manifest : Manifest
) : IManifestReadyEvent {
  return {
    type: "manifestReady",
    value: {
      abrManager,
      manifest,
    },
  };
}

function manifestUpdate(manifest : Manifest) : IManifestUpdateEvent {
  return {
    type: "manifestUpdate",
    value: {
      manifest,
    },
  };
}

function speedChanged(speed : number) : ISpeedChangedEvent {
  return {
    type: "speed",
    value: speed,
  };
}

function activePeriodChanged(period : Period) : IActivePeriodChangedEvent {
  return {
    type : "activePeriodChanged",
    value : {
      period,
    },
  };
}

function nullRepresentation(
  type : IBufferType,
  period : Period
) : IRepresentationChangeEvent {
  return {
    type: "representationChange",
    value: {
      type,
      representation: null,
      period,
    },
  };
}

function periodBufferReady(
  type : IBufferType,
  period : Period,
  adaptation$ : Subject<Adaptation|null>
) : IPeriodBufferReadyEvent {
  return {
    type: "periodBufferReady",
    value: {
      type,
      period,
      adaptation$,
    },
  };
}

function periodBufferCleared(
  type : IBufferType,
  period : Period
) : IPeriodBufferClearedEvent {
  return {
    type: "periodBufferCleared",
    value: {
      type,
      period,
    },
  };
}

function warning(value : Error | ICustomError) : IStreamWarningEvent {
  return {
    type: "warning",
    value,
  };
}

function endOfStream() : IEndOfStreamEvent {
  return {
    type: "end-of-stream",
    value: undefined,
  };
}

function resumeStream() : IResumeStreamEvent {
  return {
    type: "resume-stream",
    value: undefined,
  };
}

function bufferComplete(bufferType: IBufferType) : ICompletedBufferEvent {
  return {
    type: "complete-buffer",
    value: {
      type: bufferType,
    },
  };
}

function initialPlayback(infos?: {
  autoPlayStatus: "allowed"|"blocked";
}): IInitialPlaybackEvent {
  const autoPlayStatus = infos ? infos.autoPlayStatus : undefined;
  return {
    type: "initialPlayback",
    value: {
      autoPlayStatus,
    },
  };
}

const STREAM_EVENTS = {
  activePeriodChanged,
  adaptationChange,
  bufferComplete,
  endOfStream,
  resumeStream,
  loaded,
  manifestReady,
  manifestUpdate,
  nullRepresentation,
  periodBufferCleared,
  periodBufferReady,
  initialPlayback,
  speedChanged,
  stalled,
  warning,
};

// Every possible item emitted by the Stream
export type IStreamEvent =
  IActivePeriodChangedEvent |
  IAdaptationBufferEvent<any> |
  IAdaptationChangeEvent |
  ICompletedBufferEvent |
  IEndOfStreamEvent |
  IResumeStreamEvent |
  IManifestReadyEvent |
  IManifestUpdateEvent |
  IPeriodBufferClearedEvent |
  IPeriodBufferReadyEvent |
  ISpeedChangedEvent |
  IStalledEvent |
  IStreamLoadedEvent |
  IStreamWarningEvent |
  IInitialPlaybackEvent;

export default STREAM_EVENTS;
