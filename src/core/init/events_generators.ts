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
import {
  IAdaptation,
  IManifest,
  IPeriod,
  IRepresentation,
} from "../../manifest";
import SegmentBuffersStore, {
  IBufferType,
} from "../segment_buffers";
import { IRepresentationChangeEvent } from "../stream";
import {
  IDecipherabilityUpdateEvent,
  ILoadedEvent,
  IManifestReadyEvent,
  IManifestUpdateEvent,
  IReloadingMediaSourceEvent,
  IStalledEvent,
  IStallingSituation,
  IUnstalledEvent,
  IWarningEvent,
} from "./types";

/**
 * Construct a "loaded" event.
 * @returns {Object}
 */
function loaded(segmentBuffersStore : SegmentBuffersStore | null) : ILoadedEvent {
  return { type: "loaded", value: { segmentBuffersStore } };
}

/**
 * Construct a "stalled" event.
 * @param {Object|null} rebuffering
 * @returns {Object}
 */
function stalled(rebuffering : IStallingSituation) : IStalledEvent {
  return { type: "stalled", value: rebuffering };
}

/**
 * Construct a "stalled" event.
 * @returns {Object}
 */
function unstalled() : IUnstalledEvent {
  return { type: "unstalled", value: null };
}

/**
 * Construct a "decipherabilityUpdate" event.
 * @param {Array.<Object>} arg
 * @returns {Object}
 */
function decipherabilityUpdate(
  arg : Array<{ manifest : IManifest;
                period : IPeriod;
                adaptation : IAdaptation;
                representation : IRepresentation; }>
) : IDecipherabilityUpdateEvent {
  return { type: "decipherabilityUpdate", value: arg };
}

/**
 * Construct a "manifestReady" event.
 * @param {Object} manifest
 * @returns {Object}
 */
function manifestReady(
  manifest : IManifest
) : IManifestReadyEvent {
  return { type: "manifestReady", value: { manifest } };
}

/**
 * Construct a "manifestUpdate" event.
 * @returns {Object}
 */
function manifestUpdate() : IManifestUpdateEvent {
  return { type: "manifestUpdate", value: null };
}

/**
 * Construct a "representationChange" event.
 * @param {string} type
 * @param {Object} period
 * @returns {Object}
 */
function nullRepresentation(
  type : IBufferType,
  period : IPeriod
) : IRepresentationChangeEvent {
  return { type: "representationChange",
           value: { type,
                    representation: null,
                    period } };
}

/**
 * construct a "warning" event.
 * @param {error} value
 * @returns {object}
 */
function warning(value : ICustomError) : IWarningEvent {
  return { type: "warning", value };
}

/**
 * construct a "reloading-media-source" event.
 * @returns {object}
 */
function reloadingMediaSource() : IReloadingMediaSourceEvent {
  return { type: "reloading-media-source", value: undefined };
}

const INIT_EVENTS = { loaded,
                      decipherabilityUpdate,
                      manifestReady,
                      manifestUpdate,
                      nullRepresentation,
                      reloadingMediaSource,
                      stalled,
                      unstalled,
                      warning };

export default INIT_EVENTS;
