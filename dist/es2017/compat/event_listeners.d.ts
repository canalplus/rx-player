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
import type { IEventEmitter } from "../utils/event_emitter";
import type { IReadOnlySharedReference } from "../utils/reference";
import type { CancellationSignal } from "../utils/task_canceller";
import type { ICompatPictureInPictureWindow } from "./browser_compatibility_types";
export interface IEventEmitterLike {
    addEventListener: (eventName: string, handler: () => void) => void;
    removeEventListener: (eventName: string, handler: () => void) => void;
}
export type IEventTargetLike = HTMLElement | IEventEmitterLike | IEventEmitter<unknown>;
/**
 * Returns a function allowing to add event listeners for particular event(s)
 * optionally automatically adding browser prefixes if needed.
 * @param {Array.<string>} eventNames - The event(s) to listen to. If multiple
 * events are set, the event listener will be triggered when any of them emits.
 * @param {Array.<string>|undefined} [prefixes] - Optional vendor prefixes with
 * which the event might also be sent. If not defined, default prefixes might be
 * tested.
 * @returns {Function} - Returns function allowing to easily add a callback to
 * be triggered when that event is emitted on a given event target.
 */
declare function createCompatibleEventListener(eventNames: string[], prefixes?: string[]): (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * Get video width from Picture-in-Picture window
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} pipWindow
 * @returns {number}
 */
export interface IPictureInPictureEvent {
    isEnabled: boolean;
    pipWindow: ICompatPictureInPictureWindow | null;
}
/**
 * Emit when video enters and leaves Picture-In-Picture mode.
 * @param {HTMLMediaElement} elt
 * @param {Object} stopListening
 * @returns {Object}
 */
declare function getPictureOnPictureStateRef(elt: HTMLMediaElement, stopListening: CancellationSignal): IReadOnlySharedReference<IPictureInPictureEvent>;
/**
 * Returns a reference:
 *   - Set to `true` when video is considered as visible (the page is visible
 *     and/or the Picture-In-Picture is activated).
 *   - Set to `false` otherwise.
 * @param {Object} pipStatus
 * @param {Object} stopListening - `CancellationSignal` allowing to free the
 * resources reserved to listen to video visibility change.
 * @returns {Object}
 */
declare function getVideoVisibilityRef(pipStatus: IReadOnlySharedReference<IPictureInPictureEvent>, stopListening: CancellationSignal): IReadOnlySharedReference<boolean>;
/**
 * Get video width and height from the screen dimensions.
 * @param {Object} stopListening
 * @returns {Object}
 */
declare function getScreenResolutionRef(stopListening: CancellationSignal): IReadOnlySharedReference<{
    width: number | undefined;
    height: number | undefined;
    pixelRatio: number;
}>;
/**
 * Get video width and height from HTML media element, or video estimated
 * dimensions when Picture-in-Picture is activated.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} pipStatusRef
 * @param {Object} stopListening
 * @returns {Object}
 */
declare function getElementResolutionRef(mediaElement: HTMLMediaElement, pipStatusRef: IReadOnlySharedReference<IPictureInPictureEvent>, stopListening: CancellationSignal): IReadOnlySharedReference<{
    width: number | undefined;
    height: number | undefined;
    pixelRatio: number;
}>;
/**
 * @param {HTMLMediaElement} mediaElement
 */
declare const onLoadedMetadata: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {HTMLMediaElement} mediaElement
 */
declare const onTimeUpdate: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {TextTrackList} mediaElement
 */
declare const onTextTrackAdded: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {TextTrackList} textTrackList
 */
declare const onTextTrackRemoved: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {MediaSource} mediaSource
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
declare const onSourceOpen: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {MediaSource} mediaSource
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
declare const onSourceClose: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {MediaSource} mediaSource
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
declare const onSourceEnded: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {MediaSource} mediaSource
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
declare const onSourceBufferUpdate: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {SourceBufferList} sourceBuffers
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
declare const onRemoveSourceBuffers: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {MediaKeySession} mediaKeySession
 */
declare const onKeyMessage: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {MediaKeySession} mediaKeySession
 */
declare const onKeyAdded: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {MediaKeySession} mediaKeySession
 */
declare const onKeyError: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {MediaKeySession} mediaKeySession
 */
declare const onKeyStatusesChange: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {HTMLMediaElement} mediaElement
 */
declare const onSeeking: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {HTMLMediaElement} mediaElement
 */
declare const onSeeked: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * @param {HTMLMediaElement} mediaElement
 */
declare const onEnded: (element: IEventTargetLike, listener: (event?: unknown) => void, cancelSignal: CancellationSignal) => void;
/**
 * Utilitary function allowing to add an event listener and remove it
 * automatically once the given `CancellationSignal` emits.
 * @param {EventTarget} elt - The element on which should be attached the event
 * listener.
 * @param {string} evt - The event you wish to listen to
 * @param {Function} listener - The listener function
 * @param {Object} stopListening - Removes the event listener once this signal
 * emits
 */
declare function addEventListener(elt: IEventEmitterLike, evt: string, listener: (x?: unknown) => void, stopListening: CancellationSignal): void;
export { addEventListener, createCompatibleEventListener, getPictureOnPictureStateRef, getVideoVisibilityRef, getElementResolutionRef, getScreenResolutionRef, onEnded, onKeyAdded, onKeyError, onKeyMessage, onKeyStatusesChange, onLoadedMetadata, onRemoveSourceBuffers, onSeeked, onSeeking, onSourceClose, onSourceEnded, onSourceOpen, onTimeUpdate, onSourceBufferUpdate, onTextTrackAdded, onTextTrackRemoved, };
