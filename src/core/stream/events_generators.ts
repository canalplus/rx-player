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
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../manifest";
import { IRepresentationProtectionData } from "../../manifest/representation";
import { IPlayerError } from "../../public_types";
import objectAssign from "../../utils/object_assign";
import { IBufferType } from "../segment_buffers";
import {
  IActivePeriodChangedEvent,
  IAdaptationChangeEvent,
  IAdaptationChoice,
  IBitrateEstimationChangeEvent,
  ICompletedStreamEvent,
  IEncryptionDataEncounteredEvent,
  IEndOfStreamEvent,
  ILockedStreamEvent,
  INeedsBufferFlushEvent,
  INeedsDecipherabilityFlush,
  INeedsMediaSourceReload,
  IPeriodStreamClearedEvent,
  IPeriodStreamReadyEvent,
  IRepresentationChangeEvent,
  IResumeStreamEvent,
  IStreamEventAddedSegment,
  IStreamManifestMightBeOutOfSync,
  IStreamNeedsManifestRefresh,
  IStreamTerminatingEvent,
  IStreamWarningEvent,
  IWaitingMediaSourceReloadInternalEvent,
} from "./types";

const EVENTS = {
  activePeriodChanged(period : Period) : IActivePeriodChangedEvent {
    return { type : "activePeriodChanged",
             value : { period } };
  },

  adaptationChange(
    bufferType : IBufferType,
    adaptation : Adaptation|null,
    period : Period
  ) : IAdaptationChangeEvent {
    return { type: "adaptationChange",
             value : { type: bufferType,
                       adaptation,
                       period } };
  },

  addedSegment<T>(
    content : { adaptation : Adaptation;
                period : Period;
                representation : Representation; },
    segment : ISegment,
    buffered : TimeRanges,
    segmentData : T
  ) : IStreamEventAddedSegment<T> {
    return { type : "added-segment",
             value : { content,
                       segment,
                       segmentData,
                       buffered } };
  },

  bitrateEstimationChange(
    type : IBufferType,
    bitrate : number|undefined
  ) : IBitrateEstimationChangeEvent {
    return { type: "bitrateEstimationChange",
             value: { type, bitrate } };
  },

  streamComplete(bufferType: IBufferType) : ICompletedStreamEvent {
    return { type: "complete-stream",
             value: { type: bufferType } };
  },

  endOfStream() : IEndOfStreamEvent {
    return { type: "end-of-stream",
             value: undefined };
  },

  needsManifestRefresh() : IStreamNeedsManifestRefresh {
    return { type : "needs-manifest-refresh",
             value : undefined };
  },

  manifestMightBeOufOfSync() : IStreamManifestMightBeOutOfSync {
    return { type : "manifest-might-be-out-of-sync",
             value : undefined };
  },

  /**
   * @param {number} reloadAt - Position at which we should reload
   * @param {boolean} reloadOnPause - If `false`, stay on pause after reloading.
   * if `true`, automatically play once reloaded.
   * @returns {Object}
   */
  needsMediaSourceReload(
    reloadAt : number,
    reloadOnPause : boolean
  ) : INeedsMediaSourceReload {
    return { type: "needs-media-source-reload",
             value: { position : reloadAt,
                      autoPlay : reloadOnPause } };
  },

  /**
   * @param {string} bufferType - The buffer type for which the stream cannot
   * currently load segments.
   * @param {Object} period - The Period for which the stream cannot
   * currently load segments.
   * media source reload is linked.
   * @returns {Object}
   */
  lockedStream(
    bufferType : IBufferType,
    period : Period
  ) : ILockedStreamEvent {
    return { type: "locked-stream",
             value: { bufferType, period } };
  },

  needsBufferFlush(): INeedsBufferFlushEvent {
    return { type: "needs-buffer-flush", value: undefined };
  },

  needsDecipherabilityFlush(
    position : number,
    autoPlay : boolean,
    duration : number
  ) : INeedsDecipherabilityFlush {
    return { type: "needs-decipherability-flush",
             value: { position, autoPlay, duration } };
  },

  periodStreamReady(
    type : IBufferType,
    manifest : Manifest,
    period : Period,
    adaptation$ : Subject<IAdaptationChoice | null>
  ) : IPeriodStreamReadyEvent {
    return { type: "periodStreamReady",
             value: { type,
                      manifest,
                      period,
                      adaptation$ } };
  },

  periodStreamCleared(
    type : IBufferType,
    manifest : Manifest,
    period : Period
  ) : IPeriodStreamClearedEvent {
    return { type: "periodStreamCleared",
             value: { type, manifest, period } };
  },

  encryptionDataEncountered(
    reprProtData : IRepresentationProtectionData,
    content : { manifest : Manifest;
                period : Period;
                adaptation : Adaptation;
                representation : Representation; }
  ) : IEncryptionDataEncounteredEvent {
    return { type: "encryption-data-encountered",
             value: objectAssign({ content }, reprProtData) };
  },

  representationChange(
    type : IBufferType,
    period : Period,
    representation : Representation
  ) : IRepresentationChangeEvent {
    return { type: "representationChange",
             value: { type, period, representation } };
  },

  streamTerminating() : IStreamTerminatingEvent {
    return { type: "stream-terminating",
             value: undefined };
  },

  resumeStream() : IResumeStreamEvent {
    return { type: "resume-stream",
             value: undefined };
  },

  warning(value : IPlayerError) : IStreamWarningEvent {
    return { type: "warning", value };
  },

  waitingMediaSourceReload(
    bufferType : IBufferType,
    period : Period,
    position : number,
    autoPlay : boolean
  ) : IWaitingMediaSourceReloadInternalEvent {
    return { type: "waiting-media-source-reload",
             value: { bufferType, period, position, autoPlay } };
  },
};

export default EVENTS;
