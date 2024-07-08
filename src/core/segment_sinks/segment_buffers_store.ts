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

import { MediaError } from "../../errors";
import log from "../../log";
import type { IMediaSourceInterface } from "../../mse";
import { SourceBufferType } from "../../mse";
import createCancellablePromise from "../../utils/create_cancellable_promise";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { IBufferType, SegmentSink } from "./implementations";
import { AudioVideoSegmentSink } from "./implementations";
import type { ITextDisplayerInterface } from "./implementations/text";
import TextSegmentSink from "./implementations/text";
import type { IBufferedChunk } from "./inventory/segment_inventory";
import type { IChunkContext, IChunkContextSnapshot } from "./inventory/types";

const POSSIBLE_BUFFER_TYPES: IBufferType[] = ["audio", "video", "text"];

/** Types of "native" media buffers (i.e. which rely on a SourceBuffer) */
type INativeMediaBufferType = "audio" | "video";

/**
 * Interface containing metadata of a buffered chunk.
 * The metadata is serializable and does not contain references to JS objects
 * that are not serializable, such as Map or class instances.
 */
export interface IBufferedChunkSnapshot extends Omit<IBufferedChunk, "infos"> {
  infos: IChunkContextSnapshot;
}

/**
 * Interface representing metrics for segment sinks.
 * The metrics include information on the buffer type, codec, and segment inventory,
 * and are categorized by segment type (audio, video, text).
 */
export interface ISegmentSinkMetrics {
  segmentSinks: Record<"audio" | "video" | "text", ISegmentSinkMetricForType>;
}

interface ISegmentSinkMetricForType {
  bufferType: IBufferType;
  codec: string | undefined;
  segmentInventory: IBufferedChunkSnapshot[] | undefined;
}

/**
 * Allows to easily create and dispose SegmentSinks, which are interfaces to
 * push and remove segments.
 *
 * Only one SegmentSink per type is allowed at the same time:
 *
 *   - SegmentSinks linked to a "native" media buffer (relying on a
 *     SourceBuffer: "audio" and "video" here) are reused if one is
 *     re-created.
 *
 *   - SegmentSinks for custom types (the other types of media) are aborted
 *     each time a new one of the same type is created.
 *
 * To be able to use a SegmentSink linked to a native media buffer, you
 * will first need to create it, but also wait until the other one is either
 * created or explicitely disabled through the `disableSegmentSink` method.
 * The Promise returned by `waitForUsableBuffers` will emit when
 * that is the case.
 *
 * @class SegmentSinksStore
 */
export default class SegmentSinksStore {
  /**
   * Returns true if the type is linked to a "native" media buffer (i.e. relying
   * on a SourceBuffer object, native to the browser).
   * Native media buffers needed for the current content must all be created
   * before the content begins to be played and cannot be disposed during
   * playback.
   * @param {string} bufferType
   * @returns {Boolean}
   */
  static isNative(bufferType: string): bufferType is INativeMediaBufferType {
    return shouldHaveNativeBuffer(bufferType);
  }

  /** MediaSource on which SourceBuffer objects will be attached. */
  private readonly _mediaSource: IMediaSourceInterface;

  /**
   * List of initialized and explicitely disabled SegmentSinks.
   * A `null` value indicates that this SegmentSink has been explicitely
   * disabled. This means that the corresponding type (e.g. audio, video etc.)
   * won't be needed when playing the current content.
   */
  private _initializedSegmentSinks: Partial<Record<IBufferType, SegmentSink | null>>;

  /**
   * Callbacks called after a SourceBuffer is either created or disabled.
   * Used for example to trigger the `this.waitForUsableBuffers`
   * Promise.
   */
  private _onNativeBufferAddedOrDisabled: Array<() => void>;

  private _textInterface: ITextDisplayerInterface | null;

  private _hasVideo: boolean;

  /**
   * @param {Object} mediaSource
   * @constructor
   */
  constructor(
    mediaSource: IMediaSourceInterface,
    hasVideo: boolean,
    textDisplayerInterface: ITextDisplayerInterface | null,
  ) {
    this._mediaSource = mediaSource;
    this._textInterface = textDisplayerInterface;
    this._hasVideo = hasVideo;
    this._initializedSegmentSinks = {};
    this._onNativeBufferAddedOrDisabled = [];
  }

  /**
   * Get all currently available buffer types.
   * /!\ This list can evolve at runtime depending on feature switching.
   * @returns {Array.<string>}
   */
  public getBufferTypes(): IBufferType[] {
    const bufferTypes: IBufferType[] = this.getNativeBufferTypes();
    if (this._textInterface !== null) {
      bufferTypes.push("text");
    }
    return bufferTypes;
  }

  /**
   * Get all "native" buffer types that should be created before beginning to
   * push contents.
   * @returns {Array.<string>}
   */
  public getNativeBufferTypes(): IBufferType[] {
    return this._hasVideo ? ["video", "audio"] : ["audio"];
  }

  /**
   * Returns the current "status" of the SegmentSink linked to the buffer
   * type given.
   *
   * This function will return  an object containing a key named `type` which
   * can be equal to either one of those three value:
   *
   *   - "initialized": A SegmentSink has been created for that type.
   *     You will in this case also have a second key, `value`, which will
   *     contain the related SegmentSink instance.
   *     Please note that you will need to wait until
   *     `this.waitForUsableBuffers()` has emitted before pushing segment
   *     data to a SegmentSink relying on a SourceBuffer.
   *
   *   - "disabled": The SegmentSink has been explicitely disabled for this
   *     type.
   *
   *   - "uninitialized": No action has yet been yet for that SegmentSink.
   *
   * @param {string} bufferType
   * @returns {Object|null}
   */
  public getStatus(
    bufferType: IBufferType,
  ):
    | { type: "initialized"; value: SegmentSink }
    | { type: "uninitialized" }
    | { type: "disabled" } {
    const initializedBuffer = this._initializedSegmentSinks[bufferType];
    if (initializedBuffer === undefined) {
      return { type: "uninitialized" };
    }
    if (initializedBuffer === null) {
      return { type: "disabled" };
    }
    return { type: "initialized", value: initializedBuffer };
  }

  /**
   * Native media buffers (audio and video) needed for playing the current
   * content need to all be created (by creating SegmentSinks linked to them)
   * before any one can be used.
   *
   * This function will return a Promise resolving when any and all native
   * SourceBuffers can be used.
   *
   * From https://w3c.github.io/media-source/#methods
   *   For example, a user agent may throw a QuotaExceededError
   *   exception if the media element has reached the HAVE_METADATA
   *   readyState. This can occur if the user agent's media engine
   *   does not support adding more tracks during playback.
   * @param {Object} cancelWaitSignal
   * @return {Promise}
   */
  public waitForUsableBuffers(cancelWaitSignal: CancellationSignal): Promise<void> {
    if (this._areNativeBuffersUsable()) {
      return Promise.resolve();
    }
    return createCancellablePromise(cancelWaitSignal, (res) => {
      /* eslint-disable-next-line prefer-const */
      let onAddedOrDisabled: () => void;

      const removeCallback = () => {
        const indexOf = this._onNativeBufferAddedOrDisabled.indexOf(onAddedOrDisabled);
        if (indexOf >= 0) {
          this._onNativeBufferAddedOrDisabled.splice(indexOf, 1);
        }
      };

      onAddedOrDisabled = () => {
        if (this._areNativeBuffersUsable()) {
          removeCallback();
          res();
        }
      };
      this._onNativeBufferAddedOrDisabled.push(onAddedOrDisabled);

      return removeCallback;
    });
  }

  /**
   * Explicitely disable the SegmentSink for a given buffer type.
   * A call to this function is needed at least for unused native buffer types
   * (usually "audio" and "video"), to be able to emit through
   * `waitForUsableBuffers` when conditions are met.
   * @param {string} bufferType
   */
  public disableSegmentSink(bufferType: IBufferType): void {
    const currentValue = this._initializedSegmentSinks[bufferType];
    if (currentValue === null) {
      log.warn(`SBS: The ${bufferType} SegmentSink was already disabled.`);
      return;
    }
    if (currentValue !== undefined) {
      throw new Error("Cannot disable an active SegmentSink.");
    }
    this._initializedSegmentSinks[bufferType] = null;
    if (SegmentSinksStore.isNative(bufferType)) {
      this._onNativeBufferAddedOrDisabled.forEach((cb) => cb());
    }
  }

  /**
   * Creates a new SegmentSink associated to a type.
   * Reuse an already created one if a SegmentSink for the given type
   * already exists.
   *
   * Please note that you will need to wait until `this.waitForUsableBuffers()`
   * has emitted before pushing segment data to a SegmentSink of a native
   * type.
   * @param {string} bufferType
   * @param {string} codec
   * @returns {Object}
   */
  public createSegmentSink(bufferType: IBufferType, codec: string): SegmentSink {
    const memorizedSegmentSink = this._initializedSegmentSinks[bufferType];
    if (shouldHaveNativeBuffer(bufferType)) {
      if (!isNullOrUndefined(memorizedSegmentSink)) {
        if (
          memorizedSegmentSink instanceof AudioVideoSegmentSink &&
          memorizedSegmentSink.codec !== codec
        ) {
          log.warn(
            "SB: Reusing native SegmentSink with codec",
            memorizedSegmentSink.codec,
            "for codec",
            codec,
          );
        } else {
          log.info("SB: Reusing native SegmentSink with codec", codec);
        }
        return memorizedSegmentSink;
      }
      log.info("SB: Adding native SegmentSink with codec", codec);
      const sourceBufferType =
        bufferType === "audio" ? SourceBufferType.Audio : SourceBufferType.Video;
      const nativeSegmentSink = new AudioVideoSegmentSink(
        sourceBufferType,
        codec,
        this._mediaSource,
      );
      this._initializedSegmentSinks[bufferType] = nativeSegmentSink;
      this._onNativeBufferAddedOrDisabled.forEach((cb) => cb());
      return nativeSegmentSink;
    }

    if (!isNullOrUndefined(memorizedSegmentSink)) {
      log.info("SB: Reusing a previous custom SegmentSink for the type", bufferType);
      return memorizedSegmentSink;
    }

    let segmentSink: SegmentSink;
    if (bufferType === "text") {
      log.info("SB: Creating a new text SegmentSink");
      if (this._textInterface === null) {
        throw new Error("HTML Text track feature not activated");
      }
      segmentSink = new TextSegmentSink(this._textInterface);
      this._initializedSegmentSinks.text = segmentSink;
      return segmentSink;
    }

    log.error("SB: Unknown buffer type:", bufferType);
    throw new MediaError(
      "BUFFER_TYPE_UNKNOWN",
      "The player wants to create a SegmentSink " + "of an unknown type.",
    );
  }

  /**
   * Dispose of the active SegmentSink for the given type.
   * @param {string} bufferType
   */
  public disposeSegmentSink(bufferType: IBufferType): void {
    const memorizedSegmentSink = this._initializedSegmentSinks[bufferType];
    if (isNullOrUndefined(memorizedSegmentSink)) {
      log.warn("SB: Trying to dispose a SegmentSink that does not exist");
      return;
    }

    log.info("SB: Aborting SegmentSink", bufferType);
    memorizedSegmentSink.dispose();
    delete this._initializedSegmentSinks[bufferType];
  }

  /**
   * Dispose of all SegmentSink created on this SegmentSinksStore.
   */
  public disposeAll(): void {
    POSSIBLE_BUFFER_TYPES.forEach((bufferType: IBufferType) => {
      if (this.getStatus(bufferType).type === "initialized") {
        this.disposeSegmentSink(bufferType);
      }
    });
  }

  /**
   * Returns `true` when we're ready to push and decode contents to
   * SourceBuffers created by SegmentSinks of a native buffer type.
   */
  private _areNativeBuffersUsable() {
    const nativeBufferTypes = this.getNativeBufferTypes();

    const hasUnitializedBuffers = nativeBufferTypes.some(
      (sbType) => this._initializedSegmentSinks[sbType] === undefined,
    );
    if (hasUnitializedBuffers) {
      // one is not yet initialized/disabled
      return false;
    }

    const areAllDisabled = nativeBufferTypes.every(
      (sbType) => this._initializedSegmentSinks[sbType] === null,
    );
    if (areAllDisabled) {
      // they all are disabled: we can't play the content
      return false;
    }
    return true;
  }

  private createSegmentSinkMetricsForType(
    bufferType: IBufferType,
  ): ISegmentSinkMetricForType {
    return {
      bufferType,
      codec: this._initializedSegmentSinks[bufferType]?.codec,
      segmentInventory: this._initializedSegmentSinks[bufferType]
        ?.getLastKnownInventory()
        .map((chunk) => ({
          ...chunk,
          infos: getChunkContextSnapshot(chunk.infos),
        })),
    };
  }

  public getSegmentSinksMetrics(): ISegmentSinkMetrics {
    return {
      segmentSinks: {
        audio: this.createSegmentSinkMetricsForType("audio"),
        video: this.createSegmentSinkMetricsForType("video"),
        text: this.createSegmentSinkMetricsForType("text"),
      },
    };
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
  bufferType: string,
): bufferType is INativeMediaBufferType {
  return bufferType === "audio" || bufferType === "video";
}

function getChunkContextSnapshot(context: IChunkContext): IChunkContextSnapshot {
  return {
    adaptation: context.adaptation.getMetadataSnapshot(),
    period: context.period.getMetadataSnapshot(),
    representation: context.representation.getMetadataSnapshot(),
  };
}
