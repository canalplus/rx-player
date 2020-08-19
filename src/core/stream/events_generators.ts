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
import { IBufferType } from "../source_buffers";
import {
  IActivePeriodChangedEvent,
  IAdaptationChangeEvent,
  IBitrateEstimationChangeEvent,
  ICompletedStreamEvent,
  IEndOfStreamEvent,
  INeedsDecipherabilityFlush,
  INeedsMediaSourceReload,
  IPeriodStreamClearedEvent,
  IPeriodStreamReadyEvent,
  IProtectedSegmentEvent,
  IRepresentationChangeEvent,
  IResumeStreamEvent,
  IStreamEventAddedSegment,
  IStreamManifestMightBeOutOfSync,
  IStreamNeedsDiscontinuitySeek,
  IStreamNeedsManifestRefresh,
  IStreamStateActive,
  IStreamStateFull,
  IStreamTerminatingEvent,
  IStreamWarningEvent,
} from "./types";

const EVENTS = {
  activeStream(bufferType: IBufferType) : IStreamStateActive {
    return { type: "active-stream",
             value: { bufferType } };
  },

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

  discontinuityEncountered(
    gap : [number, number],
    bufferType : IBufferType
  ) : IStreamNeedsDiscontinuitySeek {
    return { type : "discontinuity-encountered",
             value : { bufferType, gap } };
  },

  endOfStream() : IEndOfStreamEvent {
    return { type: "end-of-stream",
             value: undefined };
  },

  fullStream(bufferType : IBufferType) : IStreamStateFull {
    return { type: "full-stream",
             value: { bufferType } };
  },

  needsManifestRefresh() : IStreamNeedsManifestRefresh {
    return { type : "needs-manifest-refresh",
             value :  undefined };
  },

  manifestMightBeOufOfSync() : IStreamManifestMightBeOutOfSync {
    return { type : "manifest-might-be-out-of-sync",
             value : undefined };
  },

  needsMediaSourceReload(
    period : Period,
    { currentTime,
      isPaused } : { currentTime : number;
                     isPaused : boolean; }
  ) : INeedsMediaSourceReload {
    return { type: "needs-media-source-reload",
             value: { currentTime, isPaused, period } };
  },

  needsDecipherabilityFlush(
    { currentTime,
      isPaused,
      duration } : { currentTime : number;
                     isPaused : boolean;
                     duration : number; }
  ) : INeedsDecipherabilityFlush {
    return { type: "needs-decipherability-flush",
             value: { currentTime, isPaused, duration } };
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

  protectedSegment(initDataInfo : { type : string;
                                    data : Uint8Array; }
  ) : IProtectedSegmentEvent {
    return { type: "protected-segment",
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
