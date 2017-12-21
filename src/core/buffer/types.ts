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

import { Observable } from "rxjs/Observable";
import Manifest from "../../manifest";
import Adaptation from "../../manifest/adaptation";
import Period from "../../manifest/period";
import Representation from "../../manifest/representation";
import Segment from "../../manifest/segment";
import { ISegmentLoaderArguments } from "../../net/types";
import QueuedSourceBuffer from "../source_buffers/queued_source_buffer";
import SegmentBookkeeper from "../source_buffers/segment_bookkeeper";
import { SupportedBufferTypes } from "../types";

export interface IBufferSegmentInfos {
  duration : number;
  time : number;
  timescale : number;
}

export interface IDownloaderResponse {
  parsed: {
    segmentData : any;
    segmentInfos : IBufferSegmentInfos;
  };
}

export interface IBufferClockTick {
  currentTime : number;
  readyState : number;
  timeOffset : number;
  stalled : object|null;
  liveGap? : number;
}

export interface IBufferArguments {
  clock$ : Observable<IBufferClockTick>;
  content: {
    representation : Representation;
    adaptation : Adaptation;
    period : Period;
    manifest : Manifest;
  };
  queuedSourceBuffer : QueuedSourceBuffer<any>;
  segmentBookkeeper : SegmentBookkeeper;
  pipeline : (x : ISegmentLoaderArguments) => Observable<IDownloaderResponse>;
  wantedBufferAhead$ : Observable<number>;
}

// -- Events emitted by the RepresentationBuffer --

// Emitted when a new segment has been added to the SourceBuffer
export interface IAddedSegmentEvent {
  type : "added-segment";
  value : {
    bufferType : SupportedBufferTypes;
    parsed : {
      segmentData : any;
      segmentInfos? : IBufferSegmentInfos;
    };
  };
}

// Emitted when the next wanted segment is after what is described by the manifest
// (The manifest should be refreshed)

// The Manifest needs to be refreshed.
// The buffer might still download segments after this message
export interface INeedingManifestRefreshEvent {
  type : "needs-manifest-refresh";
  value : Error;
}

// Emit when a discontinuity is encountered and the user is "stuck" on it.
export interface IDiscontinuityEvent {
  type : "discontinuity-encountered";
  value : {
    nextTime : number;
  };
}

// Emit when the buffer has reached its end in term of segment downloads.
// The Buffer does not download segments after this message
export interface IBufferFilledEvent {
  type: "filled";
  value : {
    wantedRange : {
      start : number;
      end : number;
    };
  };
}

// Emit when segments are being queued for download
export interface IQueuedSegmentsEvent {
  type: "segments-queued";
  value : {
    segments: Segment[]; // The downloaded segments
    wantedRange : {
      start : number;
      end : number;
    };
  };
}

export interface IBufferFinishedEvent {
  type: "finished";
  value : {
    wantedRange : {
      start : number;
      end : number;
    };
  };
}

export interface IBeforeBufferEvent {
  type: "needed-before-buffer";
  value : {
    wantedRange : {
      start : number;
      end : number;
    };
  };
}

// Emit when the buffer does nothing for 1 clock tick
export interface IWaitingBufferEvent {
  type : "waiting";
  value : {
    wantedRange : {
      start : number;
      end : number;
    };
  };
}

export interface IIdleBufferEvent {
  type : "idle";
  value : undefined;
}

export interface IBitrateEstimationChangeEvent {
  type : "bitrateEstimationChange";
  value : {
    type : SupportedBufferTypes;
    bitrate : number|undefined;
  };
}

export interface IRepresentationChangeEvent {
  type : "representationChange";
  value : {
    type : SupportedBufferTypes;
    representation : Representation|null;
  };
}

export type IRepresentationBufferStatus =
  IBeforeBufferEvent |
  IBufferFilledEvent |
  IBufferFinishedEvent |
  IIdleBufferEvent |
  IQueuedSegmentsEvent |
  IWaitingBufferEvent;

export type IRepresentationBufferEvent =
  IAddedSegmentEvent |
  IBeforeBufferEvent |
  IBufferFilledEvent |
  IBufferFinishedEvent |
  IDiscontinuityEvent |
  INeedingManifestRefreshEvent |
  IQueuedSegmentsEvent;

export type IAdaptationBufferEvent =
  IBitrateEstimationChangeEvent |
  IRepresentationBufferEvent |
  IRepresentationChangeEvent;
