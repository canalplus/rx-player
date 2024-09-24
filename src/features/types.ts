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

import type RxPlayer from "../core/api";
// eslint-disable-next-line max-len
import type MediaElementTrackChoiceManager from "../core/api/tracks_management/media_element_track_choice_manager";
import type ContentDecryptor from "../core/decrypt";
import type DirectFileContentInitializer from "../core/init/directfile_content_initializer";
import type MediaSourceContentInitializer from "../core/init/media_source_content_initializer";
import type { SegmentBuffer } from "../core/segment_buffers";
import type {
  IDashParserResponse,
  IMPDParserArguments,
} from "../parsers/manifest/dash/parsers_types";
import type DashWasmParser from "../parsers/manifest/dash/wasm-parser";
import type {
  IHTMLTextTracksParserFn,
  INativeTextTracksParserFn,
} from "../parsers/texttracks";
import type { ITransportFunction } from "../transports";
import type { CancellationSignal } from "../utils/task_canceller";

/**
 * Function allowing to implement a text track rendered by displaying them
 * through "regular" (e.g. div, span etc.) HTML elements.
 * @param {HTMLMediaElement} mediaElement - The `HTMLMediaElement` the text
 * tracks should be synced to.
 * @param {HTMLElement} textTrackElement - The parent `HTMLElement` where all
 * text tracks-related `HTMLElement` should be put.
 * @returns {Object} - `SegmentBuffer` implementation.
 */
export type IHTMLTextTracksBuffer = new (
  mediaElement: HTMLMediaElement,
  textTrackElement: HTMLElement,
) => SegmentBuffer;

/**
 * Function allowing to implement a text track rendered by displaying them
 * through a native `<track>` `HTMLElement` associated to the given
 * `mediaElement`.
 * @param {HTMLMediaElement} mediaElement - The `HTMLMediaElement` the text
 * tracks should be synced to. The `<track>` `HTMLElement` on which the text
 * tracks will be displayed will also be linked to this `HTMLMediaElement`.
 * @param {boolean} hideNativeSubtitle
 * @returns {Object} - `SegmentBuffer` implementation.
 */
export type INativeTextTracksBuffer = new (
  mediaElement: HTMLMediaElement,
  hideNativeSubtitle: boolean,
) => SegmentBuffer;

export type IMediaElementTrackChoiceManager = typeof MediaElementTrackChoiceManager;

interface IBifThumbnail {
  index: number;
  duration: number;
  ts: number;
  data: Uint8Array;
}

interface IBifObject {
  fileFormat: string;
  version: string;
  imageCount: number;
  timescale: number;
  format: string;
  width: number;
  height: number;
  aspectRatio: string;
  isVod: boolean;
  thumbs: IBifThumbnail[];
}

export type IImageBuffer = new () => SegmentBuffer;

export type IImageParser = (buffer: Uint8Array) => IBifObject;

export type IDashJsParser = (
  document: Document,
  args: IMPDParserArguments,
) => IDashParserResponse<string>;

/**
 * Function implementing the optional RxPlayer debug UI element.
 * @param {HTMLElement} parentElt - `HTMLElement` in which the debug UI
 * element will be displayed.
 * @param {Object} RxPlayer - RxPlayer instance concerned
 * @param {Object} cancelSignal - CancellationSignal allowing to free
 * up the resources taken to keep the debug UI element up-to-date.
 */
export type IDebugElementFn = (
  parentElt: HTMLElement,
  instance: RxPlayer,
  cancelSignal: CancellationSignal,
) => void;

/**
 * Interface of the global `features` object through which features are
 * accessed.
 *
 * Allows for feature-switching with the goal of reducing the bundle size for
 * an application.
 */
export interface IFeaturesObject {
  /**
   * Feature allowing to load so-called "directfile" contents, which are
   * contents natively decodable by the browser.
   */
  directfile: {
    initDirectFile: typeof DirectFileContentInitializer;
    mediaElementTrackChoiceManager: IMediaElementTrackChoiceManager;
  } | null;
  /** Handle content decryption. */
  decrypt: typeof ContentDecryptor | null;
  /** Optional debug element function (@see `IDebugElementFn`) */
  createDebugElement: IDebugElementFn | null;
  /** Implement text track rendering in the DOM. */
  htmlTextTracksBuffer: IHTMLTextTracksBuffer | null;
  /**
   * Parsers for various text track formats, by their name as set by the
   * RxPlayer.
   * Those parsers are specifically destined to be displayed in DOM elements.
   */
  htmlTextTracksParsers: Partial<Record<string, IHTMLTextTracksParserFn>>;
  imageBuffer: IImageBuffer | null;
  imageParser: IImageParser | null;
  /** Feature allowing to load contents through MediaSource API. */
  mediaSourceInit: typeof MediaSourceContentInitializer | null;
  /**
   * Function for loading and parsing contents through various protocols, by
   * their name as set by the RxPlayer.
   */
  transports: Partial<Record<string, ITransportFunction>>;
  /**
   * Manifest parsers specific to the "DASH" transport.
   */
  dashParsers: {
    /**
     * WebAssembly-based Manifest DASH parser.
     */
    wasm: DashWasmParser | null;
    /**
     * JavaScript-based Manifest DASH parser.
     */
    js: IDashJsParser | null;
  };
  nativeTextTracksBuffer: INativeTextTracksBuffer | null;
  /**
   * Parsers for various text track formats, by their name as set by the
   * RxPlayer.
   * Those parsers are specifically destined to be displayed in `<track>` HTML
   * elements.
   */
  nativeTextTracksParsers: Partial<Record<string, INativeTextTracksParserFn>>;
}

/**
 * Variant of an add-able feature (as exported by the RxPlayer) when in an
 * Object format.
 */
export interface IFeatureObject {
  _addFeature(features: IFeaturesObject): void;
}

/**
 * Variant of an add-able feature (as exported by the RxPlayer) when in an
 * Function format.
 */
export type IFeatureFunction = (features: IFeaturesObject) => void;

/**
 * How features are actually exported by the RxPlayer.
 */
export type IFeature = IFeatureObject | IFeatureFunction;
