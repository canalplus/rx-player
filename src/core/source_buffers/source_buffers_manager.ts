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

import { ICustomSourceBuffer } from "../../compat";
import { MediaError } from "../../errors";
import features from "../../features";
import log from "../../log";
import QueuedSourceBuffer, {
  IBufferType,
} from "./queued_source_buffer";

type TypedArray = Int8Array |
                  Int16Array |
                  Int32Array |
                  Uint8Array |
                  Uint16Array |
                  Uint32Array |
                  Uint8ClampedArray |
                  Float32Array |
                  Float64Array;

const POSSIBLE_BUFFER_TYPES : IBufferType[] = [ "audio",
                                                "video",
                                                "text",
                                                "image",
                                                "overlay" ];

/**
 * Get all currently available buffer types.
 * /!\ This list can evolve at runtime depending on feature switching.
 * @returns {Array.<string>}
 */
export function getBufferTypes() : IBufferType[] {
  const bufferTypes : IBufferType[] = ["audio", "video"];
  if (features.nativeTextTracksBuffer != null ||
      features.htmlTextTracksBuffer != null
  ) {
    bufferTypes.push("text");
  }
  if (features.imageBuffer != null) {
    bufferTypes.push("image");
  }
  if (features.overlayParsers != null) {
    bufferTypes.push("overlay");
  }
  return bufferTypes;
}

// Options available for a "text" SourceBuffer
export type ITextTrackSourceBufferOptions = { textTrackMode? : "native";
                                              hideNativeSubtitle? : boolean; } |
                                            { textTrackMode : "html";
                                              textTrackElement : HTMLElement; };

export interface IOverlaySourceBufferOptions {
  overlayElement : HTMLElement;
}

// General Options available for any SourceBuffer
export type ISourceBufferOptions = ITextTrackSourceBufferOptions |
                                   IOverlaySourceBufferOptions |
                                   undefined;

// Types of "native" SourceBuffers
type INativeSourceBufferType = "audio" | "video";

/**
 * Allows to easily create and dispose SourceBuffers.
 *
 * Only one SourceBuffer per type is allowed at the same time:
 *
 *   - source buffers for native types (which depends on the native
 *     SourceBuffer implementation), are reused if one is re-created.
 *
 *   - source buffers for custom types are aborted each time a new one of the
 *     same type is created.
 *
 * The returned SourceBuffer is actually a QueuedSourceBuffer instance which
 * wrap a SourceBuffer implementation to queue all its actions.
 *
 * @class SourceBuffersManager
 */
export default class SourceBuffersManager {
  /**
   * Returns true if the SourceBuffer is "native" (has to be attached to the
   * mediaSource before playback).
   * @static
   * @param {string} bufferType
   * @returns {Boolean}
   */
  static isNative(bufferType : string) : bufferType is INativeSourceBufferType {
    return shouldHaveNativeSourceBuffer(bufferType);
  }

  private readonly _mediaElement : HTMLMediaElement;
  private readonly _mediaSource : MediaSource;

  private _initializedSourceBuffers : {
    audio? : QueuedSourceBuffer<ArrayBuffer|ArrayBufferView|TypedArray|DataView|null>;
    video? : QueuedSourceBuffer<ArrayBuffer|ArrayBufferView|TypedArray|DataView|null>;
    text? : QueuedSourceBuffer<unknown>;
    image? : QueuedSourceBuffer<unknown>;
    overlay? : QueuedSourceBuffer<unknown>;
  };

  /**
   * @param {HTMLMediaElement} mediaElement
   * @param {MediaSource} mediaSource
   * @constructor
   */
  constructor(mediaElement : HTMLMediaElement, mediaSource : MediaSource) {
    this._mediaElement = mediaElement;
    this._mediaSource = mediaSource;
    this._initializedSourceBuffers = {};
  }

  /**
   * Returns the created QueuedSourceBuffer for the given type.
   * Returns null if no QueuedSourceBuffer were created for the given type.
   *
   * @param {string} bufferType
   * @returns {QueuedSourceBuffer|null}
   */
  public get(bufferType : IBufferType) : QueuedSourceBuffer<any>|null {
    return this._initializedSourceBuffers[bufferType] || null;
  }

  /**
   * Creates a new QueuedSourceBuffer for the SourceBuffer type.
   * Reuse an already created one if a QueuedSourceBuffer for the given type
   * already exists.
   * @param {string} bufferType
   * @param {string} codec
   * @param {Object|undefined} options
   * @returns {QueuedSourceBuffer}
   */
  public createSourceBuffer(
    bufferType : IBufferType,
    codec : string,
    options : ISourceBufferOptions = {}
  ) : QueuedSourceBuffer<any> {
    const memorizedSourceBuffer = this._initializedSourceBuffers[bufferType];
    if (shouldHaveNativeSourceBuffer(bufferType)) {
      if (memorizedSourceBuffer) {
        if (memorizedSourceBuffer.codec !== codec) {
          log.warn("SB: Reusing native SourceBuffer with codec",
                   memorizedSourceBuffer.codec, "for codec", codec);
        } else {
          log.info("SB: Reusing native SourceBuffer with codec", codec);
        }
        return memorizedSourceBuffer;
      }
      log.info("SB: Adding native SourceBuffer with codec", codec);
      const nativeSourceBuffer = createNativeQueuedSourceBuffer(bufferType,
                                                                this._mediaSource,
                                                                codec);
      this._initializedSourceBuffers[bufferType] = nativeSourceBuffer;
      return nativeSourceBuffer;
    }

    if (memorizedSourceBuffer) {
      log.info("SB: Reusing a previous custom SourceBuffer for the type", bufferType);
      return memorizedSourceBuffer;
    }

    switch (bufferType) {
      case "text": {
        log.info("SB: Creating a new text SourceBuffer with codec", codec);
        let sourceBuffer : ICustomSourceBuffer<unknown>;
        const opts = options as ITextTrackSourceBufferOptions; // XXX TODO
        if (opts.textTrackMode === "html") {
          if (features.htmlTextTracksBuffer == null) {
            throw new MediaError("BUFFER_TYPE_UNKNOWN",
              "HTML Text track feature not activated", true);
          }
          sourceBuffer = new features
            .htmlTextTracksBuffer(this._mediaElement, opts.textTrackElement);
        } else {
          if (features.nativeTextTracksBuffer == null) {
            throw new MediaError("BUFFER_TYPE_UNKNOWN",
              "Native Text track feature not activated", true);
          }
          sourceBuffer = new features
            .nativeTextTracksBuffer(this._mediaElement, !!opts.hideNativeSubtitle);
        }

        const queuedSourceBuffer =
          new QueuedSourceBuffer<unknown>("text", codec, sourceBuffer);
        this._initializedSourceBuffers.text = queuedSourceBuffer;
        return queuedSourceBuffer;
      }

      case "image": {
        if (features.imageBuffer == null) {
          throw new MediaError("BUFFER_TYPE_UNKNOWN",
            "Image buffer feature not activated", true);
        }
        log.info("SB: Creating a new image SourceBuffer with codec", codec);
        const sourceBuffer = new features.imageBuffer();
        const queuedSourceBuffer =
          new QueuedSourceBuffer<unknown>("image", codec, sourceBuffer);
        this._initializedSourceBuffers.image = queuedSourceBuffer;
        return queuedSourceBuffer;
      }

      case "overlay": {
        if (features.overlayBuffer == null) {
          throw new MediaError("BUFFER_TYPE_UNKNOWN",
            "Image buffer feature not activated", true);
        }
        log.info("SB: Creating a new Overlay SourceBuffer with codec", codec);
        if (
          options == null ||
          (options as IOverlaySourceBufferOptions).overlayElement == null
        ) {
          throw new MediaError("INVALID_SOURCE_BUFFER_ARGUMENTS",
            "Cannot create Overlay SourceBuffer: Invalid options.", true);
        }
        const sourceBuffer = new features.overlayBuffer(
          this._mediaElement,
          (options as IOverlaySourceBufferOptions).overlayElement // XXX TODO
        );
        const queuedSourceBuffer =
          new QueuedSourceBuffer("overlay", codec, sourceBuffer);
        this._initializedSourceBuffers.overlay = queuedSourceBuffer;
        return queuedSourceBuffer;
      }

      default:
        log.error("SB: Unknown buffer type:", bufferType);
        throw new MediaError("BUFFER_TYPE_UNKNOWN",
          "The player wants to create a SourceBuffer of an unknown type.", true);
    }
  }

  /**
   * Dispose of the active SourceBuffer for the given type.
   * @param {string} bufferType
   */
  public disposeSourceBuffer(bufferType : IBufferType) : void {
    const memorizedSourceBuffer = this._initializedSourceBuffers[bufferType];
    if (memorizedSourceBuffer == null) {
      log.warn("SB: Trying to dispose a SourceBuffer that does not exist");
      return;
    }

    log.info("SB: Aborting SourceBuffer", bufferType);
    memorizedSourceBuffer.dispose();
    if (!shouldHaveNativeSourceBuffer(bufferType) ||
        this._mediaSource.readyState === "open"
    ) {
      try {
        memorizedSourceBuffer.abort();
      } catch (e) {
        log.warn(`SB: Failed to abort a ${bufferType} SourceBuffer:`, e);
      }
    }
    delete this._initializedSourceBuffers[bufferType];
  }

  /**
   * Dispose of all QueuedSourceBuffer created on this SourceBuffersManager.
   */
  public disposeAll() {
    POSSIBLE_BUFFER_TYPES.forEach((bufferType : IBufferType) => {
      if (this.get(bufferType) != null) {
        this.disposeSourceBuffer(bufferType);
      }
    });
  }
}

/**
 * Adds a SourceBuffer to the MediaSource.
 * @param {MediaSource} mediaSource
 * @param {string} codec
 * @returns {SourceBuffer}
 */
function createNativeQueuedSourceBuffer(
  bufferType : IBufferType,
  mediaSource : MediaSource,
  codec : string
) : QueuedSourceBuffer<ArrayBuffer|ArrayBufferView|TypedArray|DataView|null> {
  const sourceBuffer = mediaSource.addSourceBuffer(codec);
  return new QueuedSourceBuffer(bufferType, codec, sourceBuffer);
}

/**
 * Returns true if the given buffeType is a native buffer, false otherwise.
 * "Native" SourceBuffers are directly added to the MediaSource.
 * @param {string} bufferType
 * @returns {Boolean}
 */
function shouldHaveNativeSourceBuffer(
  bufferType : string
) : bufferType is INativeSourceBufferType {
  return bufferType === "audio" || bufferType === "video";
}
