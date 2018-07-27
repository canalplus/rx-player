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

import {
  Observable,
  Subject,
} from "rxjs";
import { IKeySystemOption } from "../core/eme/types";
import { ICustomSourceBuffer } from "../core/source_buffers/abstract_source_buffer";
import { IDirectFileStreamOptions } from "../core/stream/directfile";
import { IStreamEvent } from "../core/stream/stream_events";
import { ICustomError } from "../errors";
import { ITransportFunction } from "../net/types";
import {
  IHTMLTextTracksParserFn,
  INativeTextTracksParserFn,
} from "../parsers/texttracks/types";

export type IDirectFileStream =
  (args : IDirectFileStreamOptions) => Observable<IStreamEvent>;

export type IEMEManager = (
  mediaElement : HTMLMediaElement,
  keySystems: IKeySystemOption[],
  errorStream : Subject<Error|ICustomError>
) => Observable<never>;

export interface INativeTextTracksBuffer {
  new(
    videoElement : HTMLMediaElement,
    hideNativeSubtitle: boolean
  ) : ICustomSourceBuffer<any>;
}

export interface IHTMLTextTracksBuffer {
  new(
    videoElement : HTMLMediaElement,
    textTrackElement: HTMLElement
  ) : ICustomSourceBuffer<any>;
}

interface IBifThumbnail {
  index : number;
  duration : number;
  ts : number;
  data : Uint8Array;
}
interface IImageTrackSegmentData {
  data : IBifThumbnail[]; // image track data, in the given type
  end : number; // end time time until which the segment apply
  start : number; // start time from which the segment apply
  timeOffset : number; // time offset, in seconds, to add to each image
  timescale : number; // timescale to convert the start and end into seconds
  type : string; // the type of the data (example: "bif")
}

interface IBifObject {
  fileFormat : string;
  version : string;
  imageCount : number;
  timescale : number;
  format : string;
  width : number;
  height : number;
  aspectRatio : string;
  isVod : boolean;
  thumbs : IBifThumbnail[];
}
export interface IImageBuffer {
  new() : ICustomSourceBuffer<IImageTrackSegmentData>;
}
export type IImageParser =
  ((buffer : Uint8Array) => IBifObject);

// interface of the global `features` object through which features are
// accessed.
export interface IFeaturesObject {
  transports : Partial<Record<string, ITransportFunction>>;
  imageBuffer : IImageBuffer|null;
  imageParser : IImageParser|null;
  nativeTextTracksBuffer : INativeTextTracksBuffer|null;
  nativeTextTracksParsers : Partial<Record<string, INativeTextTracksParserFn>>;
  htmlTextTracksBuffer : IHTMLTextTracksBuffer|null;
  htmlTextTracksParsers : Partial<Record<string, IHTMLTextTracksParserFn>>;
  emeManager : IEMEManager|null;
  directfile : IDirectFileStream|null;
}

export type IFeatureFunction = (features : IFeaturesObject) => void;
