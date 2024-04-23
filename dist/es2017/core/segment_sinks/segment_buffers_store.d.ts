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
import type { IMediaSourceInterface } from "../../mse";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { IBufferType, SegmentSink } from "./implementations";
import type { ITextDisplayerInterface } from "./implementations/text";
/** Types of "native" media buffers (i.e. which rely on a SourceBuffer) */
type INativeMediaBufferType = "audio" | "video";
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
    static isNative(bufferType: string): bufferType is INativeMediaBufferType;
    /** MediaSource on which SourceBuffer objects will be attached. */
    private readonly _mediaSource;
    /**
     * List of initialized and explicitely disabled SegmentSinks.
     * A `null` value indicates that this SegmentSink has been explicitely
     * disabled. This means that the corresponding type (e.g. audio, video etc.)
     * won't be needed when playing the current content.
     */
    private _initializedSegmentSinks;
    /**
     * Callbacks called after a SourceBuffer is either created or disabled.
     * Used for example to trigger the `this.waitForUsableBuffers`
     * Promise.
     */
    private _onNativeBufferAddedOrDisabled;
    private _textInterface;
    private _hasVideo;
    /**
     * @param {Object} mediaSource
     * @constructor
     */
    constructor(mediaSource: IMediaSourceInterface, hasVideo: boolean, textDisplayerInterface: ITextDisplayerInterface | null);
    /**
     * Get all currently available buffer types.
     * /!\ This list can evolve at runtime depending on feature switching.
     * @returns {Array.<string>}
     */
    getBufferTypes(): IBufferType[];
    /**
     * Get all "native" buffer types that should be created before beginning to
     * push contents.
     * @returns {Array.<string>}
     */
    getNativeBufferTypes(): IBufferType[];
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
    getStatus(bufferType: IBufferType): {
        type: "initialized";
        value: SegmentSink;
    } | {
        type: "uninitialized";
    } | {
        type: "disabled";
    };
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
    waitForUsableBuffers(cancelWaitSignal: CancellationSignal): Promise<void>;
    /**
     * Explicitely disable the SegmentSink for a given buffer type.
     * A call to this function is needed at least for unused native buffer types
     * (usually "audio" and "video"), to be able to emit through
     * `waitForUsableBuffers` when conditions are met.
     * @param {string} bufferType
     */
    disableSegmentSink(bufferType: IBufferType): void;
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
    createSegmentSink(bufferType: IBufferType, codec: string): SegmentSink;
    /**
     * Dispose of the active SegmentSink for the given type.
     * @param {string} bufferType
     */
    disposeSegmentSink(bufferType: IBufferType): void;
    /**
     * Dispose of all SegmentSink created on this SegmentSinksStore.
     */
    disposeAll(): void;
    /**
     * Returns `true` when we're ready to push and decode contents to
     * SourceBuffers created by SegmentSinks of a native buffer type.
     */
    private _areNativeBuffersUsable;
}
export {};
