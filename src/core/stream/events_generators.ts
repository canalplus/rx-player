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
import {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../manifest";
import { IContentProtection } from "../eme";
import { IBufferType } from "../segment_buffers";
import {
  IActivePeriodChangedEvent,
  IAdaptationChangeEvent,
  IBitrateEstimationChangeEvent,
  ICompletedStreamEvent,
  IEncryptionDataEncounteredEvent,
  IEndOfStreamEvent,
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
             value :  undefined };
  },

  manifestMightBeOufOfSync() : IStreamManifestMightBeOutOfSync {
    return { type : "manifest-might-be-out-of-sync",
             value : undefined };
  },

  /**
   * @param {Object} period - The Period to which the stream logic asking for a
   * media source reload is linked.
   * @param {number} reloadAt - Position at which we should reload
   * @param {boolean} reloadOnPause - If `false`, stay on pause after reloading.
   * if `true`, automatically play once reloaded.
   * @returns {Object}
   */
  needsMediaSourceReload(
    period : Period,
    reloadAt : number,
    reloadOnPause : boolean
  ) : INeedsMediaSourceReload {
    return { type: "needs-media-source-reload",
             value: { position : reloadAt,
                      autoPlay : reloadOnPause,
                      period } };
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
    period : Period,
    adaptation$ : Subject<Adaptation|null>
  ) : IPeriodStreamReadyEvent {
    return { type: "periodStreamReady",
             value: { type, period, adaptation$ } };
  },

  periodStreamCleared(
    type : IBufferType,
    period : Period
  ) : IPeriodStreamClearedEvent {
    return { type: "periodStreamCleared",
             value: { type, period } };
  },

  encryptionDataEncountered(
    initDataInfo : IContentProtection
  ) : IEncryptionDataEncounteredEvent {
    return { type: "encryption-data-encountered",
             value: initDataInfo };
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

  warning(value : ICustomError) : IStreamWarningEvent {
    return { type: "warning", value };
  },
};

export default EVENTS;
