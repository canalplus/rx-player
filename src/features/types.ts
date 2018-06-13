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

export const enum FEATURE_IDS {
  DASH,
  SMOOTH,
  EME,
  NATIVE_VTT,
  NATIVE_TTML,
  NATIVE_SRT,
  NATIVE_SAMI,
  HTML_VTT,
  HTML_TTML,
  HTML_SRT,
  HTML_SAMI,
  NATIVE_TEXT_BUFFER,
  HTML_TEXT_BUFFER,
  IMAGE_BUFFER,
  BIF_PARSER,
  DIRECTFILE,
}

// feature item added through feature loading
export type IFeatureListItem =
  { id : FEATURE_IDS.DASH; content : ITransportFunction } |
  { id : FEATURE_IDS.SMOOTH; content : ITransportFunction } |
  { id : FEATURE_IDS.EME; content : IEMEManager } |
  { id : FEATURE_IDS.NATIVE_VTT; content : INativeTextTracksParserFn } |
  { id : FEATURE_IDS.NATIVE_TTML; content : INativeTextTracksParserFn } |
  { id : FEATURE_IDS.NATIVE_SRT; content : INativeTextTracksParserFn } |
  { id : FEATURE_IDS.NATIVE_SAMI; content : INativeTextTracksParserFn } |
  { id : FEATURE_IDS.HTML_VTT; content : IHTMLTextTracksParserFn } |
  { id : FEATURE_IDS.HTML_TTML; content : IHTMLTextTracksParserFn } |
  { id : FEATURE_IDS.HTML_SRT; content : IHTMLTextTracksParserFn } |
  { id : FEATURE_IDS.HTML_SAMI; content : IHTMLTextTracksParserFn } |
  { id : FEATURE_IDS.NATIVE_TEXT_BUFFER; content : INativeTextTracksBuffer } |
  { id : FEATURE_IDS.HTML_TEXT_BUFFER; content : IHTMLTextTracksBuffer } |
  { id : FEATURE_IDS.IMAGE_BUFFER; content : IImageBuffer } |
  { id : FEATURE_IDS.BIF_PARSER; content : IImageParser } |
  { id : FEATURE_IDS.DIRECTFILE; content : IDirectFileStream };

// interface of the global `features` object through which features are
// accessed.
export interface IFeaturesObject {
  transports : IDictionary<ITransportFunction>;
  imageBuffer : IImageBuffer|null;
  imageParser : IImageParser|null;
  nativeTextTracksBuffer : INativeTextTracksBuffer|null;
  nativeTextTracksParsers : IDictionary<INativeTextTracksParserFn>;
  htmlTextTracksBuffer : IHTMLTextTracksBuffer|null;
  htmlTextTracksParsers : IDictionary<IHTMLTextTracksParserFn>;
  emeManager : IEMEManager|null;
  directfile : IDirectFileStream|null;
}
