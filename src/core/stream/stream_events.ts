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

import { Subject } from "rxjs/Subject";
import { CustomError } from "../../errors";
import Manifest, {
  Adaptation,
  Period,
} from "../../manifest";
import ABRManager from "../abr";
import {
  IAdaptationBufferEvent,
  IRepresentationChangeEvent,
} from "../buffer";
import { ISessionEvent } from "../eme/session";
import { SupportedBufferTypes } from "../source_buffers";
import { IStallingItem } from "./stalling_manager";

// Emit when the buffer from last period is full
export interface ICompletedBufferEvent {
  type: "complete-buffer";
  value : {
    type: SupportedBufferTypes;
  };
}

export interface IAdaptationChangeEvent {
  type : "adaptationChange";
  value : {
    type : SupportedBufferTypes;
    period : Period;
    adaptation : Adaptation|null;
  };
}

export interface IManifestReadyEvent {
  type : "manifestReady";
  value : {
    abrManager : ABRManager;
    manifest : Manifest;
  };
}

export interface IStreamWarningEvent {
  type : "warning";
  value : Error|CustomError;
}

export interface IManifestUpdateEvent {
  type : "manifestUpdate";
  value : {
    manifest : Manifest;
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

export interface IStreamLoadedEvent {
  type : "loaded";
  value : true;
}

export interface IActivePeriodChangedEvent {
  type: "activePeriodChanged";
  value : {
    period: Period;
  };
}

export interface IPeriodBufferReadyEvent {
  type : "periodBufferReady";
  value : {
    type : SupportedBufferTypes;
    period : Period;
    adaptation$ : Subject<Adaptation|null>;
  };
}

export interface IPeriodBufferClearedEvent {
  type : "periodBufferCleared";
  value : {
    type : SupportedBufferTypes;
    period : Period;
  };
}

export interface IEndOfStreamEvent {
  type: "end-of-stream";
  value: undefined;
}

function adaptationChange(
  bufferType : SupportedBufferTypes,
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
  type : SupportedBufferTypes,
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
  type : SupportedBufferTypes,
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
  type : SupportedBufferTypes,
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

function warning(value : Error | CustomError) : IStreamWarningEvent {
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

function bufferComplete(bufferType: SupportedBufferTypes) : ICompletedBufferEvent {
  return {
    type: "complete-buffer",
    value: {
      type: bufferType,
    },
  };
}

const STREAM_EVENTS = {
  activePeriodChanged,
  adaptationChange,
  bufferComplete,
  endOfStream,
  loaded,
  manifestReady,
  manifestUpdate,
  nullRepresentation,
  periodBufferCleared,
  periodBufferReady,
  speedChanged,
  stalled,
  warning,
};

// Every possible item emitted by the Stream
export type IStreamEvent =
  IActivePeriodChangedEvent |
  IAdaptationBufferEvent |
  IAdaptationChangeEvent |
  ICompletedBufferEvent |
  IEndOfStreamEvent |
  IManifestReadyEvent |
  IManifestUpdateEvent |
  IPeriodBufferClearedEvent |
  IPeriodBufferReadyEvent |
  ISessionEvent |
  ISpeedChangedEvent |
  IStalledEvent |
  IStreamLoadedEvent |
  IStreamWarningEvent;

export default STREAM_EVENTS;
