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
  Period,
} from "../../manifest";
import ABRManager from "../abr";
import { IRepresentationChangeEvent } from "../buffer/types";
import { IBufferType } from "../source_buffers";
import { IStallingItem } from "./stalling_manager";
import {
  IManifestReadyEvent,
  IManifestUpdateEvent,
  ISpeedChangedEvent,
  IStalledEvent,
  IStreamLoadedEvent,
  IStreamWarningEvent,
} from "./types";

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

function warning(value : Error | ICustomError) : IStreamWarningEvent {
  return {
    type: "warning",
    value,
  };
}

const STREAM_EVENTS = {
  loaded,
  manifestReady,
  manifestUpdate,
  nullRepresentation,
  speedChanged,
  stalled,
  warning,
};

export default STREAM_EVENTS;
