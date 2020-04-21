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

// Emitted after a new segment has been added to the SourceBuffer
export interface IBufferEventAddedSegment<T> {
  type : "added-segment";
  value : { content: { period : Period;
                       adaptation : Adaptation;
                       representation : Representation; };
            segment : ISegment; // The concerned Segment
            buffered : TimeRanges; // TimeRanges of the concerned SourceBuffer
            segmentData : T; /* The data pushed */ };
}

// The Manifest needs to be refreshed.
// The buffer might still download segments after this message
export interface IBufferNeedsManifestRefresh {
  type : "needs-manifest-refresh";
  value : undefined;
}

// The Manifest is possibly out-of-sync and needs to be refreshed
// and reseted
export interface IBufferManifestMightBeOutOfSync {
  type : "manifest-might-be-out-of-sync";
  value : undefined;
}

// Emit when a discontinuity is encountered and the user is "stuck" on it.
export interface IBufferNeedsDiscontinuitySeek {
  type : "discontinuity-encountered";
  value : {
    bufferType : IBufferType; // The type of the Representation
    gap : [number, number]; // the time we should seek to TODO this is ugly
  };
}

// Events communicating about actions that need to be taken
export type IBufferNeededActions = IBufferNeedsManifestRefresh |
                                   IBufferNeedsDiscontinuitySeek;

// State emitted when the Buffer is scheduling segments
export interface IBufferStateActive {
  type : "active-buffer";
  value : {
    bufferType : IBufferType; // The type of the Representation
  };
}

// State emitted when the buffer has been filled to the end
export interface IBufferStateFull {
  type : "full-buffer";

  // The type of the Representation
  value : { bufferType : IBufferType };
}

/** Emitted when a segment with protection information has been encountered. */
export interface IProtectedSegmentEvent {
  type : "protected-segment";
  value : { type : string;
            data : Uint8Array; }; }

export type IRepresentationBufferStateEvent = IBufferNeededActions |
                                              IBufferStateFull |
                                              IBufferStateActive |
                                              IBufferManifestMightBeOutOfSync;

// Events emitted by the Buffer
export type IRepresentationBufferEvent<T> = IBufferEventAddedSegment<T> |
                                            IProtectedSegmentEvent |
                                            IRepresentationBufferStateEvent |
                                            IBufferWarningEvent;

// Emitted as new bitrate estimations are done
export interface IBitrateEstimationChangeEvent {
  type : "bitrateEstimationChange";
  value : { type : IBufferType;
            bitrate : number|undefined; };
}

// Emitted when the current Representation considered changes
export interface IRepresentationChangeEvent {
  type : "representationChange";
  value : { type : IBufferType;
            period : Period;
            representation : Representation |
                             null; };
}

// Every events sent by the AdaptationBuffer
export type IAdaptationBufferEvent<T> = IRepresentationBufferEvent<T> |
                                        IBitrateEstimationChangeEvent |
                                        INeedsMediaSourceReload |
                                        INeedsDecipherabilityFlush |
                                        IRepresentationChangeEvent;

// The currently-downloaded Adaptation changed.
export interface IAdaptationChangeEvent { type : "adaptationChange";
                                          value : { type : IBufferType;
                                                    period : Period;
                                                    adaptation : Adaptation |
                                                                 null; }; }
// Currently-playing Period changed.
export interface IActivePeriodChangedEvent { type: "activePeriodChanged";
                                             value : { period: Period }; }

// a new PeriodBuffer is ready, waiting for an adaptation/track choice.
export interface IPeriodBufferReadyEvent {
  type : "periodBufferReady";
  value : { type : IBufferType;
            period : Period;
            adaptation$ : Subject<Adaptation|null>; };
}

// A PeriodBuffer has been cleared (it is not used anymore). Can be used for
// cleaning-up resources.
export interface IPeriodBufferClearedEvent { type : "periodBufferCleared";
                                             value : { type : IBufferType;
                                                       period : Period; }; }

// The last PeriodBuffers from every type are full.
export interface IEndOfStreamEvent { type: "end-of-stream";
                                     value: undefined; }

// A previously non-existent or full last PeriodBuffer resumed.
export interface IResumeStreamEvent { type: "resume-stream";
                                      value: undefined; }

// The last PeriodBuffer of a given type is full.
export interface ICompletedBufferEvent { type: "complete-buffer";
                                         value : { type: IBufferType }; }

// The MediaSource needs to be reloaded to continue
export interface INeedsMediaSourceReload { type: "needs-media-source-reload";
                                           value: { currentTime : number;
                                                    isPaused : boolean;
                                                    period : Period; }; }

// Emitted after the buffers have been cleaned due to an update of the
// decipherability status of some segment.
// It now needs the current buffer to be "flushed" to be sure it can
// continue.
export interface INeedsDecipherabilityFlush { type: "needs-decipherability-flush";
                                              value: { currentTime : number;
                                                       isPaused : boolean;
                                                       duration : number; }; }

// Events coming from single PeriodBuffer
export type IPeriodBufferEvent = IPeriodBufferReadyEvent |
                                 IAdaptationBufferEvent<unknown> |
                                 INeedsMediaSourceReload |
                                 IAdaptationChangeEvent;

// Events coming from function(s) managing multiple PeriodBuffers.
export type IMultiplePeriodBuffersEvent = IPeriodBufferEvent |
                                          IPeriodBufferClearedEvent |
                                          ICompletedBufferEvent;

// Every events sent by the BufferOrchestrator exported here.
export type IBufferOrchestratorEvent = IActivePeriodChangedEvent |
                                       IMultiplePeriodBuffersEvent |
                                       IEndOfStreamEvent |
                                       IResumeStreamEvent;

// A minor error happened
export interface IBufferWarningEvent { type : "warning";
                                       value : ICustomError; }
