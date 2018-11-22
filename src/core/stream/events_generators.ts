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
  IReloadingStreamEvent,
  ISpeedChangedEvent,
  IStalledEvent,
  IStreamLoadedEvent,
  IStreamPausedEvent,
  IStreamPlayingEvent,
  IStreamWarningEvent,
} from "./types";

/**
 * Construct a "loaded" event.
 * @returns {Object}
 */
function loaded() : IStreamLoadedEvent {
  return { type: "loaded", value: true };
}

/**
 * Construct a "playing" event.
 * @returns {Object}
 */
function playing() : IStreamPlayingEvent {
  return { type: "playing", value: true };
}

/**
 * Construct a "paused" event.
 * @returns {Object}
 */
function paused() : IStreamPausedEvent {
  return { type: "paused", value: true };
}

/**
 * Construct a "stalled" event.
 * @param {Object|null} stalling
 * @returns {Object}
 */
function stalled(stalling : IStallingItem|null) : IStalledEvent {
  return { type: "stalled", value: stalling };
}

/**
 * Construct a "manifestReady" event.
 * @param {Object} abrManager
 * @param {Object} manifest
 * @returns {Object}
 */
function manifestReady(
  abrManager : ABRManager,
  manifest : Manifest
) : IManifestReadyEvent {
  return {
    type: "manifestReady",
    value: { abrManager, manifest },
  };
}

/**
 * Construct a "manifestUpdate" event.
 * @param {Object} manifest
 * @param {number|undefined} sendingTime
 * @returns {Object}
 */
function manifestUpdate(
  manifest : Manifest,
  sendingTime? : number
) : IManifestUpdateEvent {
  return {
    type: "manifestUpdate",
    value: { manifest, sendingTime },
  };
}

/**
 * Construct a "speedChanged" event.
 * @param {Number} speed
 * @returns {Object}
 */
function speedChanged(speed : number) : ISpeedChangedEvent {
  return { type: "speedChanged", value: speed };
}

/**
 * Construct a "representationChange" event.
 * @param {string} type
 * @param {Object} period
 * @returns {Object}
 */
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

/**
 * Construct a "warning" event.
 * @param {Error} value
 * @returns {Object}
 */
function warning(value : Error | ICustomError) : IStreamWarningEvent {
  return { type: "warning", value };
}

function reloadingStream() : IReloadingStreamEvent {
  return { type: "reloading-stream", value: undefined };
}

const STREAM_EVENTS = {
  loaded,
  manifestReady,
  manifestUpdate,
  nullRepresentation,
  reloadingStream,
  speedChanged,
  stalled,
  playing,
  paused,
  warning,
};

export default STREAM_EVENTS;
