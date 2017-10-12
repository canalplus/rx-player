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
import { ICustomSourceBuffer } from "../stream/source_buffers";
import Representation from "../../manifest/representation";
import Segment from "../../manifest/segment";

import { SupportedBufferTypes } from "../types";

export interface IBufferClockTick {
  currentTime : number;
  readyState : number;
  timeOffset : number;
  duration? : number;
  liveGap? : number;
  stalled : object|null;
}

export interface IBufferSegmentInfos {
  duration : number;
  time : number;
  timescale : number;
}

export interface IDownloaderArgument {
  segment : Segment;
  representation : Representation;
  init: IBufferSegmentInfos|null;
}

export interface IDownloaderResponse {
  parsed: {
    segmentData : any,
    nextSegments : IBufferSegmentInfos[],
    segmentInfos : IBufferSegmentInfos,
  };
}

export interface IBufferArguments {
  sourceBuffer : ICustomSourceBuffer;
  downloader : (x : IDownloaderArgument) => Observable<IDownloaderResponse>;
  switch$ : Observable<Representation>;
  clock$ : Observable<IBufferClockTick>;
  wantedBufferAhead : Observable<number>;
  maxBufferAhead : Observable<number>;
  maxBufferBehind : Observable<number>;
  bufferType : SupportedBufferTypes;
  isLive : boolean;
}

// -- Events emitted by the Buffer --

export interface IRepresentationChangeEvent {
  type : "representationChange";
  value : {
    type : SupportedBufferTypes,
    representation : Representation|null,
  };
}

export interface IPreconditionFailedEvent {
  type : "precondition-failed";
  value : Error;
}

export interface IPipelineEvent {
  type : "pipeline";
  value : {
    bufferType : SupportedBufferTypes,
    addedSegments: IBufferSegmentInfos[],
    parsed : {
      segmentData : any
      nextSegments? : IBufferSegmentInfos[],
      segmentInfos? : IBufferSegmentInfos,
    },
  };
}

export interface IOutOfIndexEvent {
  type : "out-of-index";
  value : Error;
}

export interface IIndexDiscontinuityEvent {
  type : "index-discontinuity";
  value : {
    ts : number,
  };
}

export type BufferEvent =
  IRepresentationChangeEvent |
  IPreconditionFailedEvent |
  IPipelineEvent |
  IOutOfIndexEvent |
  IIndexDiscontinuityEvent;
