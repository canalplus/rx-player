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

import MediaError from "../../errors/MediaError";
import log from "../../utils/log";
import ImageSourceBuffer from "./image";
import OverlaySourceBuffer from "./overlay";
import QueuedSourceBuffer from "./queued_source_buffer";
import {
  HTMLTextSourceBuffer,
  NativeTextSourceBuffer,
} from "./text";

// Every SourceBuffer types managed here
export type IBufferType = "audio"|"video"|"text"|"image"|"overlay";

// Array of every SourceBuffer types managed here
export const BUFFER_TYPES : IBufferType[] =
  ["audio", "video", "text", "image", "overlay"];

// Options available for a "text" SourceBuffer
export type ITextTrackSourceBufferOptions =
  {
    textTrackMode? : "native";
    hideNativeSubtitle? : boolean;
  } |
  {
    textTrackMode : "html";
    textTrackElement : HTMLElement;
  } |
  void;

// options used for a "overlay" SourceBuffer
export interface IOverlaySourceBufferOptions {
  overlayElement : HTMLElement;
}

// possible option objects for a new SourceBuffer
export type ISourceBufferOptions =
  ITextTrackSourceBufferOptions |
  IOverlaySourceBufferOptions;

// Buffer type of "native" SourceBuffers
type INativeSourceBufferType = "audio" | "video";

// Informations on a cached SourceBuffer
interface ISourceBufferCacheInfos<T> {
  codec : string;
  sourceBuffer : QueuedSourceBuffer<T>;
}

// Informations on a cached Native SourceBuffer
type INativeSourceBufferCacheInfos =
  ISourceBufferCacheInfos<ArrayBuffer|ArrayBufferView>;

/**
 * Allows to easily create and dispose SourceBuffers.
 *
 * Only one source buffer per type is allowed at the same time.
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

  private readonly _videoElement : HTMLMediaElement;
  private readonly _mediaSource : MediaSource;

  // Keep track of native SourceBuffers created by this manager currently active
  private _cachedNativeSourceBuffers : {
    audio? : INativeSourceBufferCacheInfos;
    video? : INativeSourceBufferCacheInfos;
  };

  // Keep track of custom SourceBuffers created by this manager currently active
  private _cachedCustomSourceBuffers : {
    text? : ISourceBufferCacheInfos<any>;
    image? : ISourceBufferCacheInfos<any>;
    overlay? : ISourceBufferCacheInfos<any>;
  };

  /**
   * @param {HTMLMediaElement} videoElement
   * @param {MediaSource} mediaSource
   * @constructor
   */
  constructor(videoElement : HTMLMediaElement, mediaSource : MediaSource) {
    this._videoElement = videoElement;
    this._mediaSource = mediaSource;
    this._cachedNativeSourceBuffers = {};
    this._cachedCustomSourceBuffers = {};
  }

  /**
   * Returns true if a SourceBuffer with the type given has been created with
   * this instance of the SourceBufferManager.
   * @param {string} bufferType
   * @returns {Boolean}
   */
  public has(bufferType : IBufferType) : boolean {
    return shouldHaveNativeSourceBuffer(bufferType) ?
      !!this._cachedNativeSourceBuffers[bufferType] :
      !!this._cachedCustomSourceBuffers[bufferType];
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
      this._cachedNativeSourceBuffers[bufferType] :
      this._cachedCustomSourceBuffers[bufferType];

    return sourceBufferInfos ? sourceBufferInfos.sourceBuffer : null;
  }

  /**
   * Creates a new QueuedSourceBuffer for the given buffer type.
   *
   * Throws if a SourceBuffer has already been created for the given type.
   * @param {string} bufferType
   * @param {string} codec
   * @param {Object} [options={}]
   * @returns {QueuedSourceBuffer}
   */
  public createSourceBuffer(
    bufferType : "text",
    codec : string,
    options? : ITextTrackSourceBufferOptions
  ) : QueuedSourceBuffer<any>;
  public createSourceBuffer(
    bufferType : "overlay",
    codec : string,
    options? : IOverlaySourceBufferOptions
  ) : QueuedSourceBuffer<any>;
  public createSourceBuffer(
    bufferType : "audio"|"video"|"image",
    codec : string,
    options? : void
  ) : QueuedSourceBuffer<Uint8Array>;
  public createSourceBuffer(
    bufferType : IBufferType,
    codec : string,
    options? : ISourceBufferOptions|void
  ) : QueuedSourceBuffer<any> {

    if (shouldHaveNativeSourceBuffer(bufferType)) {
      if (this._cachedNativeSourceBuffers[bufferType]) {
        // XXX TODO MediaError
        throw new Error(`A ${bufferType} has already been created.`);
      }
      log.info("adding native SourceBuffer with codec", codec);
      const nativeSourceBuffer = createNativeQueuedSourceBuffer(this._mediaSource, codec);
      this._cachedNativeSourceBuffers[bufferType] = {
        codec,
        sourceBuffer: nativeSourceBuffer,
      };
      return nativeSourceBuffer;
    }

    if (this._cachedCustomSourceBuffers[bufferType]) {
      // XXX TODO MediaError
      throw new Error(`A ${bufferType} has already been created.`);
    }

    switch (bufferType) {

      case "text": {
        log.info("creating a new text SourceBuffer with codec", codec);

        const opts = options as ITextTrackSourceBufferOptions; // TS 2dumb4me
        const sourceBuffer = opts && opts.textTrackMode === "html" ?
          new HTMLTextSourceBuffer(this._videoElement, opts.textTrackElement) :
          new NativeTextSourceBuffer(
            this._videoElement, !!opts && opts.hideNativeSubtitle);
        const queuedSourceBuffer = new QueuedSourceBuffer<any>(sourceBuffer);

        this._cachedCustomSourceBuffers.text = {
          codec,
          sourceBuffer: queuedSourceBuffer,
        };
        return queuedSourceBuffer;
      }

      case "overlay": {
        log.info("creating a new overlay SourceBuffer with codec", codec);
        if (!options) {
          // XXX TODO Better error
          throw new Error(`invalid ${bufferType} options`);
        }
        const sourceBuffer = new OverlaySourceBuffer(
          this._videoElement,
          (options as IOverlaySourceBufferOptions).overlayElement // TODO TS 2Dumb4me
        );
        const queuedSourceBuffer = new QueuedSourceBuffer(sourceBuffer);
        this._cachedCustomSourceBuffers.overlay = {
          codec,
          sourceBuffer: queuedSourceBuffer,
        };
        return queuedSourceBuffer;
      }

      case "image": {
        log.info("creating a new image SourceBuffer with codec", codec);
        const sourceBuffer = new ImageSourceBuffer();
        const queuedSourceBuffer = new QueuedSourceBuffer<any>(sourceBuffer);
        this._cachedCustomSourceBuffers.image = {
          codec,
          sourceBuffer: queuedSourceBuffer,
        };
        return queuedSourceBuffer;
      }

      default:
        log.error("unknown buffer type:", bufferType);
        // XXX TODO?
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
        ._cachedNativeSourceBuffers[bufferType];

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
      delete this._cachedNativeSourceBuffers[bufferType];
      return;
    } else {
      switch (bufferType) {
        case "text":
        case "image":
        case "overlay":
          const memorizedSourceBuffer = this
            ._cachedCustomSourceBuffers[bufferType];

          if (memorizedSourceBuffer == null) {
            return;
          }

          log.info("aborting custom source buffer", bufferType);
          try {
            memorizedSourceBuffer.sourceBuffer.abort();
          } catch (e) {
            log.warn("failed to abort a SourceBuffer:", e);
          }
          delete this._cachedCustomSourceBuffers[bufferType];
          return;
        default:
          log.error("cannot dispose an unknown buffer type", bufferType);
      }
    }
  }

  /**
   * Dispose of all QueuedSourceBuffer created on this SourceBufferManager.
   */
  public disposeAll() {
    BUFFER_TYPES.forEach((bufferType : IBufferType) => {
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
) : QueuedSourceBuffer<ArrayBuffer|ArrayBufferView> {
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
  QueuedSourceBuffer,
};
