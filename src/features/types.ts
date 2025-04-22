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

import type { IMediaElement } from "../compat/browser_compatibility_types";
import type { SegmentSink } from "../core/segment_sinks";
import type ContentDecryptor from "../main_thread/decrypt";
import type DirectFileContentInitializer from "../main_thread/init/directfile_content_initializer";
import type MediaSourceContentInitializer from "../main_thread/init/media_source_content_initializer";
import type MultiThreadContentInitializer from "../main_thread/init/multi_thread_content_initializer";
import type HTMLTextDisplayer from "../main_thread/text_displayer/html";
import type NativeTextDisplayer from "../main_thread/text_displayer/native/native_text_displayer";
import type MediaElementTracksStore from "../main_thread/tracks_store/media_element_tracks_store";
import type { IRxPlayer } from "../main_thread/types";
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
 * @returns {Object} - `SegmentSink` implementation.
 */
export type IHTMLTextTracksBuffer = new (
  mediaElement: IMediaElement,
  textTrackElement: HTMLElement,
) => SegmentSink;

/**
 * Function allowing to implement a text track rendered by displaying them
 * through a native `<track>` `HTMLElement` associated to the given
 * `mediaElement`.
 * @param {HTMLMediaElement} mediaElement - The `HTMLMediaElement` the text
 * tracks should be synced to. The `<track>` `HTMLElement` on which the text
 * tracks will be displayed will also be linked to this `HTMLMediaElement`.
 * @returns {Object} - `SegmentSink` implementation.
 */
export type INativeTextTracksBuffer = new (mediaElement: IMediaElement) => SegmentSink;

export type IDashJsParser = (
  xml: string,
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
  instance: IRxPlayer,
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
    mediaElementTracksStore: typeof MediaElementTracksStore;
  } | null;
  /** Handle content decryption. */
  decrypt: typeof ContentDecryptor | null;
  /** Optional debug element function (@see `IDebugElementFn`) */
  createDebugElement: IDebugElementFn | null;
  /** Implement text track rendering in the DOM. */
  htmlTextDisplayer: typeof HTMLTextDisplayer | null;
  /**
   * Parsers for various text track formats, by their name as set by the
   * RxPlayer.
   * Those parsers are specifically destined to be displayed in DOM elements.
   */
  htmlTextTracksParsers: Partial<Record<string, IHTMLTextTracksParserFn>>;
  /**
   * Feature allowing to load contents through MediaSource API through the
   * main thread.
   */
  mainThreadMediaSourceInit: typeof MediaSourceContentInitializer | null;
  /**
   * Features allowing to load contents through MediaSource API through
   * a WebWorker.
   */
  multithread: {
    /** Class to load a content through MediaSource API via a WebWorker. */
    init: typeof MultiThreadContentInitializer;
  } | null;
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
     * Entirely JavaScript-based Manifest DASH parser.
     */
    js: IDashJsParser | null;
  };
  /** Implement text track rendering through `<track>` HTML elements. */
  nativeTextDisplayer: typeof NativeTextDisplayer | null;
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
