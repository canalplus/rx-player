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
  IBufferEventAddedSegment,
  IBufferManifestMightBeOutOfSync,
  IBufferNeedsDiscontinuitySeek,
  IBufferNeedsManifestRefresh,
  IBufferStateActive,
  IBufferStateFull,
  IBufferWarningEvent,
  ICompletedBufferEvent,
  IEndOfStreamEvent,
  INeedsDecipherabilityFlush,
  INeedsMediaSourceReload,
  IPeriodBufferClearedEvent,
  IPeriodBufferReadyEvent,
  IProtectedSegmentEvent,
  IRepresentationChangeEvent,
  IResumeStreamEvent,
} from "./types";

const EVENTS = {
  activeBuffer(bufferType: IBufferType) : IBufferStateActive {
    return { type: "active-buffer",
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
  ) : IBufferEventAddedSegment<T> {
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

  bufferComplete(bufferType: IBufferType) : ICompletedBufferEvent {
    return { type: "complete-buffer",
             value: { type: bufferType } };
  },

  discontinuityEncountered(
    gap : [number, number],
    bufferType : IBufferType
  ) : IBufferNeedsDiscontinuitySeek {
    return { type : "discontinuity-encountered",
             value : { bufferType, gap } };
  },

  endOfStream() : IEndOfStreamEvent {
    return { type: "end-of-stream",
             value: undefined };
  },

  fullBuffer(bufferType : IBufferType) : IBufferStateFull {
    return { type: "full-buffer",
             value: { bufferType } };
  },

  needsManifestRefresh() : IBufferNeedsManifestRefresh {
    return { type : "needs-manifest-refresh",
             value :  undefined };
  },

  manifestMightBeOufOfSync() : IBufferManifestMightBeOutOfSync {
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

  periodBufferReady(
    type : IBufferType,
    period : Period,
    adaptation$ : Subject<Adaptation|null>
  ) : IPeriodBufferReadyEvent {
    return { type: "periodBufferReady",
             value: { type, period, adaptation$ } };
  },

  periodBufferCleared(
    type : IBufferType,
    period : Period
  ) : IPeriodBufferClearedEvent {
    return { type: "periodBufferCleared",
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

  resumeStream() : IResumeStreamEvent {
    return { type: "resume-stream",
             value: undefined };
  },

  warning(value : ICustomError) : IBufferWarningEvent {
    return { type: "warning", value };
  },
};

export default EVENTS;
