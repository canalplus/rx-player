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
import { ICustomSourceBuffer } from "./abstract_source_buffer";
import ImageSourceBuffer from "./image";
import QueuedSourceBuffer from "./queued_source_buffer";
import {
  HTMLTextSourceBuffer,
  NativeTextSourceBuffer,
} from "./text";
import ICustomTimeRanges from "./time_ranges";

export const BUFFER_TYPES : SupportedBufferTypes[] =
  ["audio", "video", "text", "image"];
export type SupportedBufferTypes = "audio"|"video"|"text"|"image";

export type SourceBufferOptions =
  {
    textTrackMode? : "native";
    hideNativeSubtitle? : boolean;
  } |
  {
    textTrackMode : "html";
    textTrackElement : HTMLElement;
  };

type INativeSourceBufferType = "audio" | "video";

interface ICreatedSourceBuffer<T> {
  codec : string;
  sourceBuffer : QueuedSourceBuffer<T>;
}

type ICreatedNativeSourceBuffer =
  ICreatedSourceBuffer<ArrayBuffer|ArrayBufferView>;

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

  private _videoElement : HTMLMediaElement;
  private _mediaSource : MediaSource;

  private _initializedNativeSourceBuffers : {
    audio? : ICreatedNativeSourceBuffer;
    video? : ICreatedNativeSourceBuffer;
  };

  private _initializedCustomSourceBuffers : {
    text? : ICreatedSourceBuffer<any>;
    image? : ICreatedSourceBuffer<any>;
  };

  /**
   * @param {HTMLMediaElement} videoElement
   * @param {MediaSource} mediaSource
   * @constructor
   */
  constructor(videoElement : HTMLMediaElement, mediaSource : MediaSource) {
    this._videoElement = videoElement;
    this._mediaSource = mediaSource;
    this._initializedNativeSourceBuffers = {};
    this._initializedCustomSourceBuffers = {};
  }

  /**
   * Returns true if a SourceBuffer with the type given has been created with
   * this instance of the SourceBufferManager.
   * @param {string} bufferType
   * @returns {Boolean}
   */
  public has(bufferType : SupportedBufferTypes) : boolean {
    if (shouldHaveNativeSourceBuffer(bufferType)) {
      return !!this._initializedNativeSourceBuffers[bufferType];
    }
    return !!this._initializedCustomSourceBuffers[bufferType];
  }

  /**
   * Returns the created QueuedSourceBuffer for the given type.
   * Throws if no QueuedSourceBuffer were created for the given type.
   *
   * @param {string} bufferType
   * @returns {QueuedSourceBuffer}
   */
  public get(bufferType : SupportedBufferTypes) : QueuedSourceBuffer<any> {
    if (shouldHaveNativeSourceBuffer(bufferType)) {
      const sourceBufferInfos = this._initializedNativeSourceBuffers[bufferType];
      if (!sourceBufferInfos) {
        throw new Error(`SourceBufferManager: no ${bufferType} initialized yet`);
      }
      return sourceBufferInfos.sourceBuffer;
    } else {
      const sourceBufferInfos = this._initializedCustomSourceBuffers[bufferType];
      if (!sourceBufferInfos) {
        throw new Error(`SourceBufferManager: no ${bufferType} initialized yet`);
      }
      return sourceBufferInfos.sourceBuffer;
    }
  }

  /**
   * Creates a new QueuedSourceBuffer for the given buffer type.
   * Reuse an already created one if a QueuedSourceBuffer for the given type
   * already exists. TODO Throw or abort old one instead?
   * @param {string} bufferType
   * @param {string} codec
   * @param {Object} [options={}]
   * @returns {QueuedSourceBuffer}
   */
  public createSourceBuffer(
    bufferType : SupportedBufferTypes,
    codec : string,
    options : SourceBufferOptions = {}
  ) : QueuedSourceBuffer<any> {
    if (shouldHaveNativeSourceBuffer(bufferType)) {
      const memorizedSourceBuffer = this._initializedNativeSourceBuffers[bufferType];
      if (memorizedSourceBuffer) {
        if (memorizedSourceBuffer.codec !== codec) {
          log.warn(
            "reusing native SourceBuffer with codec", memorizedSourceBuffer.codec,
            "for codec", codec
          );
        } else {
          log.info("reusing native SourceBuffer with codec", codec);
        }
        return memorizedSourceBuffer.sourceBuffer;
      }
      log.info("adding native SourceBuffer with codec", codec);
      const nativeSourceBuffer = createNativeQueuedSourceBuffer(this._mediaSource, codec);
      this._initializedNativeSourceBuffers[bufferType] = {
        codec,
        sourceBuffer: nativeSourceBuffer,
      };
      return nativeSourceBuffer;
    }

    const memorizedCustomSourceBuffer = this
      ._initializedCustomSourceBuffers[bufferType];

    if (memorizedCustomSourceBuffer) {
      log.info("reusing a previous custom SourceBuffer for the type", bufferType);
      return memorizedCustomSourceBuffer.sourceBuffer;
    }

    if (bufferType === "text") {
      log.info("creating a new text SourceBuffer with codec", codec);

      const sourceBuffer = options.textTrackMode === "html" ?
        new HTMLTextSourceBuffer(this._videoElement, options.textTrackElement) :
        new NativeTextSourceBuffer(this._videoElement, options.hideNativeSubtitle);
      const queuedSourceBuffer = new QueuedSourceBuffer(sourceBuffer);

      this._initializedCustomSourceBuffers.text = {
        codec,
        sourceBuffer: queuedSourceBuffer,
      };
      return queuedSourceBuffer;
    } else if (bufferType === "image") {
      log.info("creating a new image SourceBuffer with codec", codec);
      const sourceBuffer = new ImageSourceBuffer();
      const queuedSourceBuffer = new QueuedSourceBuffer(sourceBuffer);
      this._initializedCustomSourceBuffers.image = {
        codec,
        sourceBuffer: queuedSourceBuffer,
      };
      return queuedSourceBuffer;
    }

    log.error("unknown buffer type:", bufferType);
    throw new MediaError("BUFFER_TYPE_UNKNOWN", null, true);
  }

  /**
   * Dispose of the active SourceBuffer for the given type.
   * @param {string} bufferType
   */
  public disposeSourceBuffer(bufferType : SupportedBufferTypes) : void {
    if (shouldHaveNativeSourceBuffer(bufferType)) {
      const memorizedNativeSourceBuffer = this
        ._initializedNativeSourceBuffers[bufferType];

      if (memorizedNativeSourceBuffer == null) {
        return;
      }

      log.info("aborting native source buffer", bufferType);
      try {
        memorizedNativeSourceBuffer.sourceBuffer.abort();
      } catch (e) {
        log.warn("failed to abort a SourceBuffer:", e);
      }
      delete this._initializedNativeSourceBuffers[bufferType];
      return;
    } else if (bufferType === "text" || bufferType === "image") {
      const memorizedSourceBuffer = this
        ._initializedCustomSourceBuffers[bufferType];

      if (memorizedSourceBuffer == null) {
        return;
      }

      log.info("aborting custom source buffer", bufferType);
      try {
        memorizedSourceBuffer.sourceBuffer.abort();
      } catch (e) {
        log.warn("failed to abort a SourceBuffer:", e);
      }
      delete this._initializedCustomSourceBuffers[bufferType];
      return;
    }

    log.error("cannot dispose an unknown buffer type", bufferType);
  }

  /**
   * Dispose of all QueuedSourceBuffer created on this SourceBufferManager.
   */
  public disposeAll() {
    BUFFER_TYPES.forEach((bufferType : SupportedBufferTypes) => {
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
  ICustomSourceBuffer,
  ICustomTimeRanges,
  QueuedSourceBuffer,
};
