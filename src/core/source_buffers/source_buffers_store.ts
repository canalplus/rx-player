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
  of as observableOf,
} from "rxjs";
import { ICustomSourceBuffer } from "../../compat";
import { MediaError } from "../../errors";
import features from "../../features";
import log from "../../log";
import QueuedSourceBuffer, {
  IBufferType,
} from "./queued_source_buffer";

const POSSIBLE_BUFFER_TYPES : IBufferType[] = [ "audio",
                                                "video",
                                                "text",
                                                "image" ];

// Options available for a "text" SourceBuffer
export type ITextTrackSourceBufferOptions = { textTrackMode? : "native";
                                              hideNativeSubtitle? : boolean; } |
                                            { textTrackMode : "html";
                                              textTrackElement : HTMLElement; };

// General Options available for any SourceBuffer
export type ISourceBufferOptions = ITextTrackSourceBufferOptions;

// Types of "native" SourceBuffers
type INativeSourceBufferType = "audio" | "video";

/**
 * Allows to easily create and dispose SourceBuffers.
 *
 * Only one SourceBuffer per type is allowed at the same time:
 *
 *   - SourceBuffers for native types (which are "audio" and "video" and which
 *     depend on the native SourceBuffer implementation) are reused if one is
 *     re-created.
 *
 *   - SourceBuffers for custom types are aborted each time a new one of the
 *     same type is created.
 *
 * The returned SourceBuffer is actually a QueuedSourceBuffer instance which
 * wrap a SourceBuffer implementation and queue all its actions.
 *
 * To be able to use a native SourceBuffer, you will first need to create it,
 * but also wait until the other one is either created or explicitely
 * disabled through the `disableSourceBuffer` method.
 * The Observable returned by `waitForUsableSourceBuffers` will emit when
 * that is the case.
 *
 * @class SourceBuffersStore
 */
export default class SourceBuffersStore {
  /**
   * Returns true if the SourceBuffer is "native".
   * Native SourceBuffers needed for the current content must all be created
   * before the content begins to be played and cannot be disposed during
   * playback.
   * @param {string} bufferType
   * @returns {Boolean}
   */
  static isNative(bufferType : string) : bufferType is INativeSourceBufferType {
    return shouldHaveNativeSourceBuffer(bufferType);
  }

  /**
   * HTMLMediaElement on which the MediaSource (on which wanted SourceBuffers
   * will be created) is attached.
   */
  private readonly _mediaElement : HTMLMediaElement;

  /** MediaSource on which the SourceBuffers will be created. */
  private readonly _mediaSource : MediaSource;

  /**
   * List of initialized and explicitely disabled SourceBuffers.
   * SourceBuffers are actually wrapped in QueuedSourceBuffer objects for easier
   * exploitation.
   * A `null` value indicates that this SourceBuffers has been explicitely
   * disabled. This means that the corresponding type (e.g. audio, video etc.)
   * won't be needed when playing the current content.
   */
  private _initializedSourceBuffers : {
    audio? : QueuedSourceBuffer<BufferSource | null> |
             null;
    video? : QueuedSourceBuffer<BufferSource | null> |
              null;
    text? : QueuedSourceBuffer<unknown> |
            null;
    image? : QueuedSourceBuffer<unknown> |
             null;
  };

  /**
   * Callbacks called when a native SourceBuffers is either created or disabled.
   * Used for example to trigger the `this.waitForUsableSourceBuffers`
   * Observable.
   */
  private _onNativeSourceBufferAddedOrDisabled : Array<() => void>;

  /**
   * @param {HTMLMediaElement} mediaElement
   * @param {MediaSource} mediaSource
   * @constructor
   */
  constructor(mediaElement : HTMLMediaElement, mediaSource : MediaSource) {
    this._mediaElement = mediaElement;
    this._mediaSource = mediaSource;
    this._initializedSourceBuffers = {};
    this._onNativeSourceBufferAddedOrDisabled = [];
  }

  /**
   * Get all currently available buffer types.
   * /!\ This list can evolve at runtime depending on feature switching.
   * @returns {Array.<string>}
   */
  public getBufferTypes() : IBufferType[] {
    const bufferTypes : IBufferType[] = this.getNativeBufferTypes();
    if (features.nativeTextTracksBuffer != null ||
        features.htmlTextTracksBuffer != null
    ) {
      bufferTypes.push("text");
    }
    if (features.imageBuffer != null) {
      bufferTypes.push("image");
    }
    return bufferTypes;
  }

  /**
   * Get all "native" buffer types that should be created before beginning to
   * push contents.
   * @returns {Array.<string>}
   */
  public getNativeBufferTypes() : IBufferType[] {
    return this._mediaElement.nodeName === "AUDIO" ? ["audio"] :
                                                     ["video", "audio"];
  }

  /**
   * Returns the current "status" of the SourceBuffer linked to the buffer type
   * given.
   *
   * This function will return  an object containing a key named `type` which
   * can be equal to either one of those three value:
   *
   *   - "initialized": A SourceBuffer has been created for that type.
   *     You will in this case also have a second key, `value`, which will
   *     contain the related QueuedSourceBuffer instance.
   *     Please note that you will need to wait until
   *     `this.waitForUsableSourceBuffers()` has emitted before pushing segment
   *     data to a native QueuedSourceBuffer.
   *
   *   - "disabled": The SourceBuffer has been explicitely disabled for this
   *     type.
   *
   *   - "uninitialized": No action has yet been yet for that SourceBuffer.
   *
   * @param {string} bufferType
   * @returns {QueuedSourceBuffer|null}
   */
  public getStatus(bufferType : IBufferType) : { type : "initialized";
                                                 value : QueuedSourceBuffer<any>; } |
                                               { type : "uninitialized" } |
                                               { type : "disabled" }
  {
    const initializedBuffer = this._initializedSourceBuffers[bufferType];
    return initializedBuffer === undefined ? { type: "uninitialized" } :
           initializedBuffer === null      ? { type: "disabled" } :
                                             { type: "initialized",
                                               value: initializedBuffer };
  }

  /**
   * Native SourceBuffers (audio and video) needed for playing the current
   * content need to all be created before any one can be used.
   *
   * This function will return an Observable emitting when any and all native
   * SourceBuffers through this store can be used.
   *
   * From https://w3c.github.io/media-source/#methods
   *   For example, a user agent may throw a QuotaExceededError
   *   exception if the media element has reached the HAVE_METADATA
   *   readyState. This can occur if the user agent's media engine
   *   does not support adding more tracks during playback.
   * @return {Observable}
   */
  public waitForUsableSourceBuffers() : Observable<void> {
    if (this._areNativeSourceBuffersUsable()) {
      return observableOf(undefined);
    }
    return new Observable(obs => {
      this._onNativeSourceBufferAddedOrDisabled.push(() => {
        if (this._areNativeSourceBuffersUsable()) {
          obs.next(undefined);
          obs.complete();
        }
      });
    });
  }

  /**
   * Explicitely disable the SourceBuffer for a given buffer type.
   * A call to this function is needed at least for unused native buffer types
   * (usually "audio" and "video"), to be able to emit through
   * `waitForUsableSourceBuffers` when conditions are met.
   * @param {string}
   */
  public disableSourceBuffer(bufferType : IBufferType) : void {
    const currentValue = this._initializedSourceBuffers[bufferType];
    if (currentValue === null) {
      log.warn(`SBS: The ${bufferType} SourceBuffer was already disabled.`);
      return;
    }
    if (currentValue !== undefined) {
      throw new Error("Cannot disable an active SourceBuffer.");
    }
    this._initializedSourceBuffers[bufferType] = null;
    if (SourceBuffersStore.isNative(bufferType)) {
      this._onNativeSourceBufferAddedOrDisabled.forEach(cb => cb());
    }
  }

  /**
   * Creates a new QueuedSourceBuffer for the SourceBuffer type.
   * Reuse an already created one if a QueuedSourceBuffer for the given type
   * already exists.
   *
   * Please note that you will need to wait until `this.waitForUsableSourceBuffers()`
   * has emitted before pushing segment data to a native QueuedSourceBuffer.
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
      if (memorizedSourceBuffer != null) {
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
      this._onNativeSourceBufferAddedOrDisabled.forEach(cb => cb());
      return nativeSourceBuffer;
    }

    if (memorizedSourceBuffer != null) {
      log.info("SB: Reusing a previous custom SourceBuffer for the type", bufferType);
      return memorizedSourceBuffer;
    }

    if (bufferType === "text") {
      log.info("SB: Creating a new text SourceBuffer with codec", codec);

      let sourceBuffer : ICustomSourceBuffer<unknown>;
      if (options.textTrackMode === "html") {
        if (features.htmlTextTracksBuffer == null) {
          throw new Error("HTML Text track feature not activated");
        }
        sourceBuffer = new features.htmlTextTracksBuffer(this._mediaElement,
                                                         options.textTrackElement);
      } else {
        if (features.nativeTextTracksBuffer == null) {
          throw new Error("Native Text track feature not activated");
        }
        sourceBuffer = new features
          .nativeTextTracksBuffer(this._mediaElement,
                                  options.hideNativeSubtitle === true);
      }

      const queuedSourceBuffer = new QueuedSourceBuffer<unknown>("text",
                                                                 codec,
                                                                 sourceBuffer);
      this._initializedSourceBuffers.text = queuedSourceBuffer;
      return queuedSourceBuffer;
    } else if (bufferType === "image") {
      if (features.imageBuffer == null) {
        throw new Error("Image buffer feature not activated");
      }
      log.info("SB: Creating a new image SourceBuffer with codec", codec);
      const sourceBuffer = new features.imageBuffer();
      const queuedSourceBuffer = new QueuedSourceBuffer<unknown>("image",
                                                                 codec,
                                                                 sourceBuffer);
      this._initializedSourceBuffers.image = queuedSourceBuffer;
      return queuedSourceBuffer;
    }

    log.error("SB: Unknown buffer type:", bufferType);
    throw new MediaError("BUFFER_TYPE_UNKNOWN",
                         "The player wants to create a SourceBuffer of an unknown type.");
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
   * Dispose of all QueuedSourceBuffer created on this SourceBuffersStore.
   */
  public disposeAll() {
    POSSIBLE_BUFFER_TYPES.forEach((bufferType : IBufferType) => {
      if (this.getStatus(bufferType).type === "initialized") {
        this.disposeSourceBuffer(bufferType);
      }
    });
  }

  /**
   * Returns `true` when we're ready to push and decode contents through our
   * created native SourceBuffers.
   */
  private _areNativeSourceBuffersUsable() {
    const nativeBufferTypes = this.getNativeBufferTypes();

    if (nativeBufferTypes.some(sbType =>
          this._initializedSourceBuffers[sbType] === undefined))
    {
      // one is not yet initialized/disabled
      return false;
    }

    if (nativeBufferTypes.every(sbType =>
          this._initializedSourceBuffers[sbType] === null))
    {
      // they all are disabled: we can't play the content
      return false;
    }
    return true;
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
) : QueuedSourceBuffer<BufferSource | null> {
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
