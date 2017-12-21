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
import Period from "../../manifest/period";
import ABRManager from "../abr";
import {
  IAdaptationBufferEvent,
  IRepresentationChangeEvent,
} from "../buffer/types";
import { ISessionEvent } from "../eme/session";
import { SupportedBufferTypes } from "../types";
import { IStallingItem } from "./stalling_manager";

export interface IAdaptationChangeEvent {
  type : "adaptationChange";
  value : {
    type : SupportedBufferTypes;
    adaptation : Adaptation|null;
  };
}

// Subjects given to allow a choice between the different adaptations available
export type IAdaptationsSubject =
  Record<SupportedBufferTypes, ReplaySubject<Adaptation|null>>;

export interface IManifestChangeEvent {
  type : "manifestChange";
  value : {
    manifest : Manifest;
    period : Period;
    adaptations$ : IAdaptationsSubject;
    abrManager : ABRManager;
  };
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

export interface IPeriodChangeEvent {
  type : "periodChange";
  value : {
    manifest : Manifest;
      period : Period;
      adaptations$ : IAdaptationsSubject;
  };
}

export interface IManifestExpired {
  type: "manifest-expired";
  value: number;
}

const STREAM_EVENTS = {
  adaptationChange(
    bufferType : SupportedBufferTypes,
    adaptation : Adaptation|null
  ) : IAdaptationChangeEvent {
    return {
      type: "adaptationChange",
      value : {
        type: bufferType,
        adaptation,
      },
    };
  },

  loaded() : IStreamLoadedEvent {
    return {
      type: "loaded",
      value: true,
    };
  },

  manifestChange(
    abrManager : ABRManager,
    manifest : Manifest,
    period : Period,
    adaptations$ : IAdaptationsSubject
  ) : IManifestChangeEvent {
    return {
      type: "manifestChange",
      value: {
        manifest,
        period,
        adaptations$,
        abrManager,
      },
    };
  },

  manifestUpdate(manifest : Manifest) : IManifestUpdateEvent {
    return {
      type: "manifestUpdate",
      value: {
        manifest,
      },
    };
  },

  speedChanged(speed : number) : ISpeedChangedEvent {
    return {
      type: "speed",
      value: speed,
    };
  },

  stalled(stalling : IStallingItem|null) : IStalledEvent {
    return {
      type: "stalled",
      value: stalling,
    };
  },

  periodChange(
    manifest : Manifest,
    period : Period,
    adaptations$ : IAdaptationsSubject
  ) : IPeriodChangeEvent {
    return {
      type : "periodChange",
      value : {
        manifest,
        period,
        adaptations$,
      },
    };
  },

  nullRepresentation(type : SupportedBufferTypes) : IRepresentationChangeEvent {
    return {
      type: "representationChange",
      value: {
        type,
        representation: null,
      },
    };
  },
};

// Every possible item emitted by the Stream
export type IStreamEvent =
  IAdaptationChangeEvent |
  IManifestChangeEvent |
  IManifestUpdateEvent |
  ISpeedChangedEvent |
  IStalledEvent |
  IStreamLoadedEvent |
  IAdaptationBufferEvent |
  IPeriodChangeEvent |
  ISessionEvent |
  IManifestExpired;

export default STREAM_EVENTS;
