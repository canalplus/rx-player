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
import { MediaError } from "../../errors";
import features from "../../features";
import log from "../../log";
import {
  AudioVideoSegmentBuffer,
  IBufferType,
  SegmentBuffer,
} from "./implementations";

const POSSIBLE_BUFFER_TYPES : IBufferType[] = [ "audio",
                                                "video",
                                                "text" ];

/** Options available for a "text" SegmentBuffer */
export type ITextTrackSegmentBufferOptions = { textTrackMode? : "native" } |
                                             { textTrackMode : "html";
                                               textTrackElement : HTMLElement; };

/** General Options available for any SegmentBuffer */
export type ISegmentBufferOptions = ITextTrackSegmentBufferOptions;

/** Types of "native" media buffers (i.e. which rely on a SourceBuffer) */
type INativeMediaBufferType = "audio" | "video";

/**
 * Allows to easily create and dispose SegmentBuffers, which are interfaces to
 * push and remove segments.
 *
 * Only one SegmentBuffer per type is allowed at the same time:
 *
 *   - SegmentBuffers linked to a "native" media buffer (relying on a
 *     SourceBuffer: "audio" and "video" here) are reused if one is
 *     re-created.
 *
 *   - SegmentBuffers for custom types (the other types of media) are aborted
 *     each time a new one of the same type is created.
 *
 * To be able to use a SegmentBuffer linked to a native media buffer, you
 * will first need to create it, but also wait until the other one is either
 * created or explicitely disabled through the `disableSegmentBuffer` method.
 * The Observable returned by `waitForUsableBuffers` will emit when
 * that is the case.
 *
 * @class SegmentBuffersStore
 */
export default class SegmentBuffersStore {
  /**
   * Returns true if the type is linked to a "native" media buffer (i.e. relying
   * on a SourceBuffer object, native to the browser).
   * Native media buffers needed for the current content must all be created
   * before the content begins to be played and cannot be disposed during
   * playback.
   * @param {string} bufferType
   * @returns {Boolean}
   */
  static isNative(bufferType : string) : bufferType is INativeMediaBufferType {
    return shouldHaveNativeBuffer(bufferType);
  }

  /** HTMLMediaElement on which the MediaSource is attached.  */
  private readonly _mediaElement : HTMLMediaElement;

  /** MediaSource on which SourceBuffer objects will be attached. */
  private readonly _mediaSource : MediaSource;

  /**
   * List of initialized and explicitely disabled SegmentBuffers.
   * A `null` value indicates that this SegmentBuffer has been explicitely
   * disabled. This means that the corresponding type (e.g. audio, video etc.)
   * won't be needed when playing the current content.
   */
  private _initializedSegmentBuffers : Partial<Record<IBufferType, SegmentBuffer | null>>;

  /**
   * Callbacks called after a SourceBuffer is either created or disabled.
   * Used for example to trigger the `this.waitForUsableBuffers`
   * Observable.
   */
  private _onNativeBufferAddedOrDisabled : Array<() => void>;

  /**
   * @param {HTMLMediaElement} mediaElement
   * @param {MediaSource} mediaSource
   * @constructor
   */
  constructor(mediaElement : HTMLMediaElement, mediaSource : MediaSource) {
    this._mediaElement = mediaElement;
    this._mediaSource = mediaSource;
    this._initializedSegmentBuffers = {};
    this._onNativeBufferAddedOrDisabled = [];
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
   * Returns the current "status" of the SegmentBuffer linked to the buffer
   * type given.
   *
   * This function will return  an object containing a key named `type` which
   * can be equal to either one of those three value:
   *
   *   - "initialized": A SegmentBuffer has been created for that type.
   *     You will in this case also have a second key, `value`, which will
   *     contain the related SegmentBuffer instance.
   *     Please note that you will need to wait until
   *     `this.waitForUsableBuffers()` has emitted before pushing segment
   *     data to a SegmentBuffer relying on a SourceBuffer.
   *
   *   - "disabled": The SegmentBuffer has been explicitely disabled for this
   *     type.
   *
   *   - "uninitialized": No action has yet been yet for that SegmentBuffer.
   *
   * @param {string} bufferType
   * @returns {Object|null}
   */
  public getStatus(bufferType : IBufferType) : { type : "initialized";
                                                 value : SegmentBuffer; } |
                                               { type : "uninitialized" } |
                                               { type : "disabled" }
  {
    const initializedBuffer = this._initializedSegmentBuffers[bufferType];
    return initializedBuffer === undefined ? { type: "uninitialized" } :
           initializedBuffer === null      ? { type: "disabled" } :
                                             { type: "initialized",
                                               value: initializedBuffer };
  }

  /**
   * Native media buffers (audio and video) needed for playing the current
   * content need to all be created (by creating SegmentBuffers linked to them)
   * before any one can be used.
   *
   * This function will return an Observable emitting when any and all native
   * SourceBuffers can be used.
   *
   * From https://w3c.github.io/media-source/#methods
   *   For example, a user agent may throw a QuotaExceededError
   *   exception if the media element has reached the HAVE_METADATA
   *   readyState. This can occur if the user agent's media engine
   *   does not support adding more tracks during playback.
   * @return {Observable}
   */
  public waitForUsableBuffers() : Observable<void> {
    if (this._areNativeBuffersUsable()) {
      return observableOf(undefined);
    }
    return new Observable(obs => {
      this._onNativeBufferAddedOrDisabled.push(() => {
        if (this._areNativeBuffersUsable()) {
          obs.next(undefined);
          obs.complete();
        }
      });
    });
  }

  /**
   * Explicitely disable the SegmentBuffer for a given buffer type.
   * A call to this function is needed at least for unused native buffer types
   * (usually "audio" and "video"), to be able to emit through
   * `waitForUsableBuffers` when conditions are met.
   * @param {string}
   */
  public disableSegmentBuffer(bufferType : IBufferType) : void {
    const currentValue = this._initializedSegmentBuffers[bufferType];
    if (currentValue === null) {
      log.warn(`SBS: The ${bufferType} SegmentBuffer was already disabled.`);
      return;
    }
    if (currentValue !== undefined) {
      throw new Error("Cannot disable an active SegmentBuffer.");
    }
    this._initializedSegmentBuffers[bufferType] = null;
    if (SegmentBuffersStore.isNative(bufferType)) {
      this._onNativeBufferAddedOrDisabled.forEach(cb => cb());
    }
  }

  /**
   * Creates a new SegmentBuffer associated to a type.
   * Reuse an already created one if a SegmentBuffer for the given type
   * already exists.
   *
   * Please note that you will need to wait until `this.waitForUsableBuffers()`
   * has emitted before pushing segment data to a SegmentBuffer of a native
   * type.
   * @param {string} bufferType
   * @param {string} codec
   * @param {Object|undefined} options
   * @returns {Object}
   */
  public createSegmentBuffer(
    bufferType : IBufferType,
    codec : string,
    options : ISegmentBufferOptions = {}
  ) : SegmentBuffer {
    const memorizedSegmentBuffer = this._initializedSegmentBuffers[bufferType];
    if (shouldHaveNativeBuffer(bufferType)) {
      if (memorizedSegmentBuffer != null) {
        if (memorizedSegmentBuffer instanceof AudioVideoSegmentBuffer &&
            memorizedSegmentBuffer.codec !== codec)
        {
          log.warn("SB: Reusing native SegmentBuffer with codec",
                   memorizedSegmentBuffer.codec, "for codec", codec);
        } else {
          log.info("SB: Reusing native SegmentBuffer with codec", codec);
        }
        return memorizedSegmentBuffer;
      }
      log.info("SB: Adding native SegmentBuffer with codec", codec);
      const nativeSegmentBuffer = new AudioVideoSegmentBuffer(bufferType,
                                                              codec,
                                                              this._mediaSource);
      this._initializedSegmentBuffers[bufferType] = nativeSegmentBuffer;
      this._onNativeBufferAddedOrDisabled.forEach(cb => cb());
      return nativeSegmentBuffer;
    }

    if (memorizedSegmentBuffer != null) {
      log.info("SB: Reusing a previous custom SegmentBuffer for the type", bufferType);
      return memorizedSegmentBuffer;
    }

    let segmentBuffer : SegmentBuffer;
    if (bufferType === "text") {
      log.info("SB: Creating a new text SegmentBuffer");

      if (options.textTrackMode === "html") {
        if (features.htmlTextTracksBuffer == null) {
          throw new Error("HTML Text track feature not activated");
        }
        segmentBuffer = new features.htmlTextTracksBuffer(this._mediaElement,
                                                          options.textTrackElement);
      } else {
        if (features.nativeTextTracksBuffer == null) {
          throw new Error("Native Text track feature not activated");
        }
        segmentBuffer = new features.nativeTextTracksBuffer(this._mediaElement);

      }
      this._initializedSegmentBuffers.text = segmentBuffer;
      return segmentBuffer;
    }

    log.error("SB: Unknown buffer type:", bufferType);
    throw new MediaError("BUFFER_TYPE_UNKNOWN",
                         "The player wants to create a SegmentBuffer " +
                         "of an unknown type.");
  }

  /**
   * Dispose of the active SegmentBuffer for the given type.
   * @param {string} bufferType
   */
  public disposeSegmentBuffer(bufferType : IBufferType) : void {
    const memorizedSegmentBuffer = this._initializedSegmentBuffers[bufferType];
    if (memorizedSegmentBuffer == null) {
      log.warn("SB: Trying to dispose a SegmentBuffer that does not exist");
      return;
    }

    log.info("SB: Aborting SegmentBuffer", bufferType);
    memorizedSegmentBuffer.dispose();
    delete this._initializedSegmentBuffers[bufferType];
  }

  /**
   * Dispose of all SegmentBuffer created on this SegmentBuffersStore.
   */
  public disposeAll() : void {
    POSSIBLE_BUFFER_TYPES.forEach((bufferType : IBufferType) => {
      if (this.getStatus(bufferType).type === "initialized") {
        this.disposeSegmentBuffer(bufferType);
      }
    });
  }

  /**
   * Returns `true` when we're ready to push and decode contents to
   * SourceBuffers created by SegmentBuffers of a native buffer type.
   */
  private _areNativeBuffersUsable() {
    const nativeBufferTypes = this.getNativeBufferTypes();

    const hasUnitializedBuffers = nativeBufferTypes.some(sbType =>
      this._initializedSegmentBuffers[sbType] === undefined);
    if (hasUnitializedBuffers) {
      // one is not yet initialized/disabled
      return false;
    }

    const areAllDisabled = nativeBufferTypes.every(sbType =>
      this._initializedSegmentBuffers[sbType] === null);
    if (areAllDisabled) {
      // they all are disabled: we can't play the content
      return false;
    }
    return true;
  }
}

/**
 * Returns true if the given buffeType has a linked SourceBuffer implementation,
 * false otherwise.
 * SourceBuffers are directly added to the MediaSource.
 * @param {string} bufferType
 * @returns {Boolean}
 */
function shouldHaveNativeBuffer(
  bufferType : string
) : bufferType is INativeMediaBufferType {
  return bufferType === "audio" || bufferType === "video";
}
