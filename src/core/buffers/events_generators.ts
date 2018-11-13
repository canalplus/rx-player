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
  IFetchedPeriod,
  ISegment,
  Representation,
} from "../../manifest";
import { IBufferType } from "../source_buffers";
import {
  IActivePeriodChangedEvent,
  IAdaptationChangeEvent,
  IBitrateEstimationChangeEvent,
  IBufferEventAddedSegment,
  IBufferNeedsDiscontinuitySeek,
  IBufferNeedsManifestRefresh,
  IBufferStateActive,
  IBufferStateFull,
  IBufferWarningEvent,
  ICompletedBufferEvent,
  IEndOfStreamEvent,
  INeedsMediaSourceReload,
  IPeriodBufferClearedEvent,
  IPeriodBufferReadyEvent,
  IRepresentationChangeEvent,
  IResumeStreamEvent,
} from "./types";

const EVENTS = {
  activeBuffer(bufferType: IBufferType) : IBufferStateActive {
    return { type: "active-buffer",
             value: { bufferType } };
  },

  activePeriodChanged(period : IFetchedPeriod) : IActivePeriodChangedEvent {
    return { type : "activePeriodChanged",
             value : { period } };
  },

  adaptationChange(
    bufferType : IBufferType,
    adaptation : Adaptation|null,
    period : IFetchedPeriod
  ) : IAdaptationChangeEvent {
    return { type: "adaptationChange",
             value : { type: bufferType,
                       adaptation,
                       period } };
  },

  addedSegment<T>(
    bufferType : IBufferType,
    segment : ISegment,
    segmentData : T
  ) : IBufferEventAddedSegment<T> {
    return { type : "added-segment",
             value : { bufferType, segment, segmentData } };
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
    bufferType : IBufferType,
    nextTime : number
  ) : IBufferNeedsDiscontinuitySeek {
    return { type : "discontinuity-encountered",
             value : { bufferType, nextTime } };
  },

  endOfStream() : IEndOfStreamEvent {
    return { type: "end-of-stream",
             value: undefined };
  },

  fullBuffer(bufferType : IBufferType) : IBufferStateFull {
    return { type: "full-buffer",
             value: { bufferType } };
  },

  needsManifestRefresh(bufferType : IBufferType) : IBufferNeedsManifestRefresh {
    return { type : "needs-manifest-refresh",
             value : { bufferType } };
  },

  needsMediaSourceReload() : INeedsMediaSourceReload {
    return { type: "needs-media-source-reload", value: undefined };
  },

  periodBufferReady(
    type : IBufferType,
    period : IFetchedPeriod,
    adaptation$ : Subject<Adaptation|null>
  ) : IPeriodBufferReadyEvent {
    return { type: "periodBufferReady",
             value: { type, period, adaptation$ } };
  },

  periodBufferCleared(
    type : IBufferType,
    period : IFetchedPeriod
  ) : IPeriodBufferClearedEvent {
    return { type: "periodBufferCleared",
             value: { type, period } };
  },

  representationChange(
    type : IBufferType,
    period : IFetchedPeriod,
    representation : Representation
  ) : IRepresentationChangeEvent {
    return { type: "representationChange",
             value: { type, period, representation } };
  },

  resumeStream() : IResumeStreamEvent {
    return { type: "resume-stream",
             value: undefined };
  },

  warning(value : Error | ICustomError) : IBufferWarningEvent {
    return { type: "warning",
             value };
  },
};

export default EVENTS;
