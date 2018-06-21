/**
 g Copyright 2015 CANAL+ Group
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

import MediaError from "../../errors/MediaError";
import features from "../../features";
import log from "../../log";
import { ICustomSourceBuffer } from "./abstract_source_buffer";
import BufferGarbageCollector from "./garbage_collector";
import QueuedSourceBuffer from "./queued_source_buffer";

// Every SourceBuffer types managed here
export type IBufferType = "audio"|"video"|"text"|"image"|"overlay";

type TypedArray =
  Int8Array |
  Int16Array |
  Int32Array |
  Uint8Array |
  Uint16Array |
  Uint32Array |
  Uint8ClampedArray |
  Float32Array |
  Float64Array;

const POSSIBLE_BUFFER_TYPES : IBufferType[] =
  ["audio", "video", "text", "image", "overlay"];

/**
 * Get all currently available buffer types.
 * /!\ This list can evolve at runtime depending on feature switching.
 * @returns {Array.<string>}
 */
export function getBufferTypes() : IBufferType[] {
  const bufferTypes : IBufferType[] = ["audio", "video"];
  if (
    features.nativeTextTracksBuffer != null ||
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
export type ITextTrackSourceBufferOptions =
  {
    textTrackMode? : "native";
    hideNativeSubtitle? : boolean;
  } |
  {
    textTrackMode : "html";
    textTrackElement : HTMLElement;
  };

export interface IOverlaySourceBufferOptions {
  overlayElement : HTMLElement;
}

// General Options available for any SourceBuffer
export type ISourceBufferOptions =
  ITextTrackSourceBufferOptions |
  IOverlaySourceBufferOptions |
  undefined;

// Types of "native" SourceBuffers
type INativeSourceBufferType = "audio" | "video";

interface ISourceBufferInfos<T> {
  codec : string;
  sourceBuffer : QueuedSourceBuffer<T>;
}

type INativeSourceBufferInfos =
  ISourceBufferInfos<ArrayBuffer|ArrayBufferView|TypedArray|DataView|null>;

/**
 * Allows to easily create and dispose SourceBuffers.
 *
 * Only one source buffer per type is allowed at the same time:
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
 * @class SourceBufferManager
 */
export default class SourceBufferManager {
  /**
   * Returns true if the source buffer is "native" (has to be attached to the
   * mediaSource at the beginning of the stream.
   * @static
   * @param {string} bufferType
   * @returns {Boolean}
   */
  static isNative(bufferType : string) : bufferType is INativeSourceBufferType {
    return shouldHaveNativeSourceBuffer(bufferType);
  }

  private readonly _mediaElement : HTMLMediaElement;
  private readonly _mediaSource : MediaSource;

  private _nativeSourceBuffers : {
    audio? : INativeSourceBufferInfos;
    video? : INativeSourceBufferInfos;
  };

  private _customSourceBuffers : {
    text? : ISourceBufferInfos<unknown>;
    image? : ISourceBufferInfos<unknown>;
    overlay? : ISourceBufferInfos<unknown>;
  };

  /**
   * @param {HTMLMediaElement} mediaElement
   * @param {MediaSource} mediaSource
   * @constructor
   */
  constructor(mediaElement : HTMLMediaElement, mediaSource : MediaSource) {
    this._mediaElement = mediaElement;
    this._mediaSource = mediaSource;
    this._nativeSourceBuffers = {};
    this._customSourceBuffers = {};
  }

  /**
   * Returns true if a SourceBuffer with the type given has been created with
   * this instance of the SourceBufferManager.
   * @param {string} bufferType
   * @returns {Boolean}
   */
  public has(bufferType : IBufferType) : boolean {
    return shouldHaveNativeSourceBuffer(bufferType) ?
      !!this._nativeSourceBuffers[bufferType] :
      !!this._customSourceBuffers[bufferType];
  }

  /**
   * Returns the created QueuedSourceBuffer for the given type.
   * Returns null if no QueuedSourceBuffer were created for the given type.
   *
   * @param {string} bufferType
   * @returns {QueuedSourceBuffer|null}
   */
  public get(bufferType : IBufferType) : QueuedSourceBuffer<any>|null {
    const sourceBufferInfos = shouldHaveNativeSourceBuffer(bufferType) ?
      this._nativeSourceBuffers[bufferType] :
      this._customSourceBuffers[bufferType];

    return sourceBufferInfos ? sourceBufferInfos.sourceBuffer : null;
  }

  /**
   * Creates a new QueuedSourceBuffer for the given buffer type.
   *
   * Throws if a SourceBuffer has already been created for the given type.
   * @param {string} bufferType
   * @param {string} codec
   * @param {Object|undefined} options
   * @returns {QueuedSourceBuffer}
   */
  public createSourceBuffer(
    bufferType : IBufferType,
    codec : string,
    options? : ISourceBufferOptions|undefined
  ) : QueuedSourceBuffer<any> {
    if (shouldHaveNativeSourceBuffer(bufferType)) {
      if (this._nativeSourceBuffers[bufferType] != null) {
        // This should never happen
        throw new MediaError("DUPLICATED_SOURCE_BUFFER", null, true);
      }
      log.info("adding native SourceBuffer with codec", codec);
      const nativeSourceBuffer = createNativeQueuedSourceBuffer(this._mediaSource, codec);
      this._nativeSourceBuffers[bufferType] = {
        codec,
        sourceBuffer: nativeSourceBuffer,
      };
      return nativeSourceBuffer;
    }

    if (this._customSourceBuffers[bufferType] != null) {
      // This should never happen
      throw new MediaError("DUPLICATED_SOURCE_BUFFER", null, true);
    }

    switch (bufferType) {
      case "text": {
        log.info("creating a new text SourceBuffer with codec", codec);
        const opts = options as ITextTrackSourceBufferOptions;

        let sourceBuffer : ICustomSourceBuffer<unknown>;
        if (opts.textTrackMode === "html") {
          if (features.htmlTextTracksBuffer == null) {
            throw new MediaError("BUFFER_TYPE_UNKNOWN", null, true);
          }
          sourceBuffer = new features
            .htmlTextTracksBuffer(this._mediaElement, opts.textTrackElement);
        } else {
          if (features.nativeTextTracksBuffer == null) {
            throw new MediaError("BUFFER_TYPE_UNKNOWN", null, true);
          }
          sourceBuffer = new features
            .nativeTextTracksBuffer(this._mediaElement, !!opts.hideNativeSubtitle);
        }
        const queuedSourceBuffer = new QueuedSourceBuffer<unknown>(sourceBuffer);

        this._customSourceBuffers.text = {
          codec,
          sourceBuffer: queuedSourceBuffer,
        };
        return queuedSourceBuffer;
      }

      case "image": {
        if (features.imageBuffer == null) {
          throw new MediaError("BUFFER_TYPE_UNKNOWN", null, true);
        }
        log.info("creating a new image SourceBuffer with codec", codec);
        const sourceBuffer = new features.imageBuffer();
        const queuedSourceBuffer = new QueuedSourceBuffer<unknown>(sourceBuffer);
        this._customSourceBuffers.image = {
          codec,
          sourceBuffer: queuedSourceBuffer,
        };
        return queuedSourceBuffer;
      }

      case "overlay": {
        if (features.overlayBuffer == null) {
          throw new MediaError("BUFFER_TYPE_UNKNOWN", null, true);
        }
        log.info("creating a new overlay SourceBuffer with codec", codec);
        if (!options) {
          // This should never happen
          throw new MediaError("INVALID_SOURCE_BUFFER_ARGUMENTS", null, true);
        }
        const sourceBuffer = new features.overlayBuffer(
          this._mediaElement,
          (options as IOverlaySourceBufferOptions).overlayElement // TS 2Dumb4me
        );
        const queuedSourceBuffer = new QueuedSourceBuffer(sourceBuffer);
        this._customSourceBuffers.overlay = {
          codec,
          sourceBuffer: queuedSourceBuffer,
        };
        return queuedSourceBuffer;
      }

      default:
        log.error("unknown buffer type:", bufferType);
        throw new MediaError("BUFFER_TYPE_UNKNOWN", null, true);
    }
  }

  /**
   * Dispose of the active SourceBuffer for the given type.
   * @param {string} bufferType
   */
  public disposeSourceBuffer(bufferType : IBufferType) : void {
    if (shouldHaveNativeSourceBuffer(bufferType)) {
      const memorizedNativeSourceBuffer = this
        ._nativeSourceBuffers[bufferType];

      if (memorizedNativeSourceBuffer == null) {
        return;
      }

      log.info("aborting native source buffer", bufferType);
      if (this._mediaSource.readyState === "open") {
        try {
          memorizedNativeSourceBuffer.sourceBuffer.abort();
        } catch (e) {
          log.warn("failed to abort a SourceBuffer:", e);
        }
      }
      delete this._nativeSourceBuffers[bufferType];
      return;
    }

    switch (bufferType) {
      case "text":
      case "image":
      case "overlay":
        const memorizedSourceBuffer = this
          ._customSourceBuffers[bufferType];

        if (memorizedSourceBuffer == null) {
          return;
        }

        log.info("aborting custom source buffer", bufferType);
        try {
          memorizedSourceBuffer.sourceBuffer.abort();
        } catch (e) {
          log.warn("failed to abort a SourceBuffer:", e);
        }
        delete this._customSourceBuffers[bufferType];
        return;

      default:
        log.error("cannot dispose an unknown buffer type", bufferType);
    }
  }

  /**
   * Dispose of all QueuedSourceBuffer created on this SourceBufferManager.
   */
  public disposeAll() {
    POSSIBLE_BUFFER_TYPES.forEach((bufferType : IBufferType) => {
      if (this.has(bufferType)) {
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
  mediaSource : MediaSource,
  codec : string
) : QueuedSourceBuffer<ArrayBuffer|ArrayBufferView|TypedArray|DataView|null> {
  const sourceBuffer = mediaSource.addSourceBuffer(codec);
  return new QueuedSourceBuffer(sourceBuffer);
}

/**
 * Returns true if the given buffeType is a native buffer, false otherwise.
 * "Native" source buffers are directly added to the MediaSource.
 * @param {string} bufferType
 * @returns {Boolean}
 */
function shouldHaveNativeSourceBuffer(
  bufferType : string
) : bufferType is INativeSourceBufferType {
  return bufferType === "audio" || bufferType === "video";
}

export {
  BufferGarbageCollector,
  QueuedSourceBuffer,
};
