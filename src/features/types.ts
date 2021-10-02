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

import { Observable } from "rxjs";
// eslint-disable-next-line max-len
import MediaElementTracksStore from "../core/api/track_management/media_element_tracks_store";
import type ContentDecryptor from "../core/decrypt";
import {
  IDirectfileEvent,
  IDirectFileOptions,
} from "../core/init/initialize_directfile";
import { SegmentBuffer } from "../core/segment_buffers";
import {
  IDashParserResponse,
  IMPDParserArguments,
} from "../parsers/manifest/dash/parsers_types";
import DashWasmParser from "../parsers/manifest/dash/wasm-parser";
import {
  IHTMLTextTracksParserFn,
  INativeTextTracksParserFn,
} from "../parsers/texttracks";
import { ITransportFunction } from "../transports";

export type IDirectFileInit = (args : IDirectFileOptions) =>
                                Observable<IDirectfileEvent>;

export type IContentDecryptorClass = typeof ContentDecryptor;

export type IHTMLTextTracksBuffer =
  new(mediaElement : HTMLMediaElement,
      textTrackElement : HTMLElement) => SegmentBuffer;

export type INativeTextTracksBuffer =
  new(mediaElement : HTMLMediaElement) => SegmentBuffer;

export type IMediaElementTracksStore = typeof MediaElementTracksStore;

export type IDashJsParser = (
  document: Document,
  args : IMPDParserArguments
) => IDashParserResponse<string>;

// interface of the global `features` object through which features are
// accessed.
export interface IFeaturesObject {
  directfile : { initDirectFile: IDirectFileInit;
                 mediaElementTracksStore : IMediaElementTracksStore; } |
               null;
  ContentDecryptor : IContentDecryptorClass|null;
  htmlTextTracksBuffer : IHTMLTextTracksBuffer|null;
  htmlTextTracksParsers : Partial<Record<string, IHTMLTextTracksParserFn>>;
  transports : Partial<Record<string, ITransportFunction>>;
  dashParsers : {
    wasm : DashWasmParser | null;
    js : IDashJsParser | null;
  };
  nativeTextTracksBuffer : INativeTextTracksBuffer|null;
  nativeTextTracksParsers : Partial<Record<string, INativeTextTracksParserFn>>;
}

export interface IFeatureObject {
  _addFeature(features : IFeaturesObject) : void;
}

export type IFeatureFunction = (features : IFeaturesObject) => void;

export type IFeature = IFeatureObject |
                       IFeatureFunction;
