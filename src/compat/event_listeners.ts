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

import config from "../config";
import log from "../log";
import type { IEventEmitter } from "../utils/event_emitter";
import globalScope from "../utils/global_scope";
import isNonEmptyString from "../utils/is_non_empty_string";
import isNullOrUndefined from "../utils/is_null_or_undefined";
import noop from "../utils/noop";
import type { IReadOnlySharedReference } from "../utils/reference";
import SharedReference from "../utils/reference";
import type { CancellationSignal } from "../utils/task_canceller";
import type {
  ICompatDocument,
  ICompatPictureInPictureWindow,
  IEventTarget,
  IMediaElement,
} from "./browser_compatibility_types";

const BROWSER_PREFIXES = ["", "webkit", "moz", "ms"];

/**
 * Find the first supported event from the list given.
 * @param {HTMLElement} element
 * @param {string} eventNameSuffix
 * @returns {Boolean}
 */
function isEventSupported(element: HTMLElement, eventNameSuffix: string): boolean {
  const clone = document.createElement(element.tagName);
  const eventName = "on" + eventNameSuffix;
  if (eventName in clone) {
    return true;
  } else {
    clone.setAttribute(eventName, "return;");
    return (
      typeof (clone as HTMLElement & Partial<Record<string, unknown>>)[eventName] ===
      "function"
    );
  }
}

/**
 * Find the first supported event from the list given.
 * @param {HTMLElement} element
 * @param {Array.<string>} eventNames
 * @returns {string|undefined}
 */
function findSupportedEvent(
  element: HTMLElement,
  eventNames: string[],
): string | undefined {
  return eventNames.filter((name) => isEventSupported(element, name))[0];
}

/**
 * @param {Array.<string>} eventNames
 * @param {Array.<string>|undefined} prefixes
 * @returns {Array.<string>}
 */
function eventPrefixed(eventNames: string[], prefixes?: string[]): string[] {
  return eventNames.reduce(
    (parent: string[], name: string) =>
      parent.concat(
        (prefixes === undefined ? BROWSER_PREFIXES : prefixes).map((p) => p + name),
      ),
    [],
  );
}

export interface IEventEmitterLike {
  addEventListener: (
    eventName: string,
    handler: EventListenerOrEventListenerObject,
  ) => void;
  removeEventListener: (
    eventName: string,
    handler: EventListenerOrEventListenerObject,
  ) => void;
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
function createCompatibleEventListener(
  eventNames: string[],
  prefixes?: string[],
): (
  element: IEventTargetLike,
  listener: (event?: Event) => void,
  cancelSignal: CancellationSignal,
) => void {
  let mem: string | undefined;
  const prefixedEvents = eventPrefixed(eventNames, prefixes);

  return (
    element: IEventTargetLike,
    listener: (event?: Event) => void,
    cancelSignal: CancellationSignal,
  ) => {
    if (cancelSignal.isCancelled()) {
      return;
    }
    // if the element is a HTMLElement we can detect
    // the supported event, and memoize it in `mem`
    if (typeof HTMLElement !== "undefined" && element instanceof HTMLElement) {
      if (typeof mem === "undefined") {
        mem = findSupportedEvent(element, prefixedEvents);
      }

      if (isNonEmptyString(mem)) {
        element.addEventListener(mem, listener);
        cancelSignal.register(() => {
          if (mem !== undefined) {
            element.removeEventListener(mem, listener);
          }
        });
      } else {
        if ((__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.DEV as number)) {
          log.warn(
            `compat: element ${element.tagName}` +
              " does not support any of these events: " +
              prefixedEvents.join(", "),
          );
        }
        return;
      }
    }

    prefixedEvents.forEach((eventName) => {
      let hasSetOnFn = false;
      if (typeof element.addEventListener === "function") {
        (element as IEventEmitterLike).addEventListener(eventName, listener);
      } else {
        hasSetOnFn = true;
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        (element as any)["on" + eventName] = listener;
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      }
      cancelSignal.register(() => {
        if (typeof element.removeEventListener === "function") {
          (element as IEventEmitterLike).removeEventListener(eventName, listener);
        }
        if (hasSetOnFn) {
          /* eslint-disable @typescript-eslint/no-unsafe-member-access */
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          delete (element as any)["on" + eventName];
          /* eslint-enable @typescript-eslint/no-unsafe-member-access */
        }
      });
    });
  };
}

/**
 * Returns a reference:
 *   - set to `true` when the document is visible
 *   - set to `false` when the document is hidden
 * @param {Object} stopListening - `CancellationSignal` allowing to free the
 * ressources allocated to update this value.
 * @returns {Object}
 */
function getDocumentVisibilityRef(
  stopListening: CancellationSignal,
): IReadOnlySharedReference<boolean> {
  let prefix: string | undefined;

  const doc = document as ICompatDocument;
  if (!isNullOrUndefined(doc.hidden)) {
    prefix = "";
  } else if (!isNullOrUndefined(doc.mozHidden)) {
    prefix = "moz";
  } else if (!isNullOrUndefined(doc.msHidden)) {
    prefix = "ms";
  } else if (!isNullOrUndefined(doc.webkitHidden)) {
    prefix = "webkit";
  }

  const hidden = isNonEmptyString(prefix) ? ((prefix + "Hidden") as "hidden") : "hidden";
  const visibilityChangeEvent = isNonEmptyString(prefix)
    ? prefix + "visibilitychange"
    : "visibilitychange";

  const isHidden = document[hidden];
  const ref = new SharedReference(!isHidden, stopListening);

  addEventListener(
    document,
    visibilityChangeEvent,
    () => {
      const isVisible = !document[hidden];
      ref.setValueIfChanged(isVisible);
    },
    stopListening,
  );

  return ref;
}

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
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} stopListening
 * @returns {Object}
 */
function getPictureOnPictureStateRef(
  mediaElement: IMediaElement,
  stopListening: CancellationSignal,
): IReadOnlySharedReference<IPictureInPictureEvent> {
  if (
    mediaElement.webkitSupportsPresentationMode === true &&
    typeof mediaElement.webkitSetPresentationMode === "function"
  ) {
    const isWebKitPIPEnabled =
      mediaElement.webkitPresentationMode === "picture-in-picture";
    const ref = new SharedReference<IPictureInPictureEvent>(
      {
        isEnabled: isWebKitPIPEnabled,
        pipWindow: null,
      },
      stopListening,
    );
    addEventListener(
      mediaElement,
      "webkitpresentationmodechanged",
      () => {
        const isEnabled = mediaElement.webkitPresentationMode === "picture-in-picture";
        ref.setValue({ isEnabled, pipWindow: null });
      },
      stopListening,
    );
    return ref;
  }

  const isPIPEnabled =
    document.pictureInPictureElement === (mediaElement as unknown as HTMLElement);
  const ref = new SharedReference<IPictureInPictureEvent>(
    { isEnabled: isPIPEnabled, pipWindow: null },
    stopListening,
  );
  addEventListener(
    mediaElement,
    "enterpictureinpicture",
    (evt) => {
      ref.setValue({
        isEnabled: true,
        pipWindow:
          (
            evt as Event & {
              pictureInPictureWindow?: ICompatPictureInPictureWindow;
            }
          ).pictureInPictureWindow ?? null,
      });
    },
    stopListening,
  );
  addEventListener(
    mediaElement,
    "leavepictureinpicture",
    () => {
      ref.setValue({ isEnabled: false, pipWindow: null });
    },
    stopListening,
  );
  return ref;
}

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
function getVideoVisibilityRef(
  pipStatus: IReadOnlySharedReference<IPictureInPictureEvent>,
  stopListening: CancellationSignal,
): IReadOnlySharedReference<boolean> {
  const isDocVisibleRef = getDocumentVisibilityRef(stopListening);
  let currentTimeout: ReturnType<typeof setTimeout> | undefined;
  const ref = new SharedReference(true, stopListening);
  stopListening.register(() => {
    clearTimeout(currentTimeout);
    currentTimeout = undefined;
  });

  isDocVisibleRef.onUpdate(checkCurrentVisibility, {
    clearSignal: stopListening,
  });
  pipStatus.onUpdate(checkCurrentVisibility, { clearSignal: stopListening });
  checkCurrentVisibility();
  return ref;

  function checkCurrentVisibility(): void {
    clearTimeout(currentTimeout);
    currentTimeout = undefined;
    if (pipStatus.getValue().isEnabled || isDocVisibleRef.getValue()) {
      ref.setValueIfChanged(true);
    } else {
      const { INACTIVITY_DELAY } = config.getCurrent();
      currentTimeout = setTimeout(() => {
        ref.setValueIfChanged(false);
      }, INACTIVITY_DELAY);
    }
  }
}

/**
 * Get video width and height from the screen dimensions.
 * @param {Object} stopListening
 * @returns {Object}
 */
function getScreenResolutionRef(
  stopListening: CancellationSignal,
): IReadOnlySharedReference<{
  width: number | undefined;
  height: number | undefined;
  pixelRatio: number;
}> {
  const pixelRatio =
    isNullOrUndefined(globalScope.devicePixelRatio) || globalScope.devicePixelRatio === 0
      ? 1
      : globalScope.devicePixelRatio;
  const ref = new SharedReference<{
    width: number | undefined;
    height: number | undefined;
    pixelRatio: number;
  }>(
    {
      width: globalScope.screen?.width,
      height: globalScope.screen?.height,
      pixelRatio,
    },
    stopListening,
  );
  const interval = setInterval(checkScreenResolution, 20000);
  stopListening.register(function stopUpdating() {
    clearInterval(interval);
  });
  return ref;
  function checkScreenResolution() {
    const oldVal = ref.getValue();
    if (
      oldVal.width !== screen.width ||
      oldVal.height !== screen.height ||
      oldVal.pixelRatio !== pixelRatio
    ) {
      ref.setValue({ width: screen.width, height: screen.height, pixelRatio });
    }
  }
}

/**
 * Get video width and height from HTML media element, or video estimated
 * dimensions when Picture-in-Picture is activated.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} pipStatusRef
 * @param {Object} stopListening
 * @returns {Object}
 */
function getElementResolutionRef(
  mediaElement: IMediaElement,
  pipStatusRef: IReadOnlySharedReference<IPictureInPictureEvent>,
  stopListening: CancellationSignal,
): IReadOnlySharedReference<{
  width: number | undefined;
  height: number | undefined;
  pixelRatio: number;
}> {
  const pixelRatio =
    isNullOrUndefined(globalScope.devicePixelRatio) || globalScope.devicePixelRatio === 0
      ? 1
      : globalScope.devicePixelRatio;
  const ref = new SharedReference<{
    width: number | undefined;
    height: number | undefined;
    pixelRatio: number;
  }>(
    {
      width: mediaElement.clientWidth,
      height: mediaElement.clientHeight,
      pixelRatio,
    },
    stopListening,
  );
  let clearPreviousEventListener = noop;
  pipStatusRef.onUpdate(checkElementResolution, { clearSignal: stopListening });
  addEventListener(globalScope, "resize", checkElementResolution, stopListening);
  addEventListener(
    mediaElement,
    "enterpictureinpicture",
    checkElementResolution,
    stopListening,
  );
  addEventListener(
    mediaElement,
    "leavepictureinpicture",
    checkElementResolution,
    stopListening,
  );
  const interval = setInterval(checkElementResolution, 20000);

  checkElementResolution();

  stopListening.register(function stopUpdating() {
    clearPreviousEventListener();
    clearInterval(interval);
  });
  return ref;

  function checkElementResolution() {
    clearPreviousEventListener();
    const pipStatus = pipStatusRef.getValue();
    const { pipWindow } = pipStatus;
    if (!pipStatus.isEnabled) {
      const oldVal = ref.getValue();
      if (
        oldVal.width !== mediaElement.clientWidth ||
        oldVal.height !== mediaElement.clientHeight ||
        oldVal.pixelRatio !== pixelRatio
      ) {
        ref.setValue({
          width: mediaElement.clientWidth,
          height: mediaElement.clientHeight,
          pixelRatio,
        });
      }
    } else if (!isNullOrUndefined(pipWindow)) {
      const onPipResize = () => {
        updateToPipWindowResolution();
      };
      pipWindow.addEventListener("resize", onPipResize);
      clearPreviousEventListener = () => {
        pipWindow.removeEventListener("resize", onPipResize);
        clearPreviousEventListener = noop;
      };
      updateToPipWindowResolution();
    } else {
      const oldVal = ref.getValue();
      if (
        oldVal.width !== undefined ||
        oldVal.height !== undefined ||
        oldVal.pixelRatio !== pixelRatio
      ) {
        ref.setValue({ width: undefined, height: undefined, pixelRatio });
      }
    }
    function updateToPipWindowResolution() {
      const oldVal = ref.getValue();
      if (
        oldVal.width !== pipWindow?.width ||
        oldVal.height !== pipWindow?.height ||
        oldVal.pixelRatio !== pixelRatio
      ) {
        ref.setValue({
          width: pipWindow?.width,
          height: pipWindow?.height,
          pixelRatio,
        });
      }
    }
  }
}

/**
 * @param {HTMLMediaElement} mediaElement
 */
const onLoadedMetadata = createCompatibleEventListener(["loadedmetadata"]);

/**
 * @param {HTMLMediaElement} mediaElement
 */
const onTimeUpdate = createCompatibleEventListener(["timeupdate"]);

/**
 * @param {TextTrackList} mediaElement
 */
const onTextTrackAdded = createCompatibleEventListener(["addtrack"]);

/**
 * @param {TextTrackList} textTrackList
 */
const onTextTrackRemoved = createCompatibleEventListener(["removetrack"]);

/**
 * @param {MediaSource} mediaSource
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
const onSourceOpen = createCompatibleEventListener(["sourceopen", "webkitsourceopen"]);

/**
 * @param {MediaSource} mediaSource
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
const onSourceClose = createCompatibleEventListener(["sourceclose", "webkitsourceclose"]);

/**
 * @param {MediaSource} mediaSource
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
const onSourceEnded = createCompatibleEventListener(["sourceended", "webkitsourceended"]);

/**
 * @param {MediaSource} mediaSource
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
const onSourceBufferUpdate = createCompatibleEventListener(["update"]);

/**
 * @param {SourceBufferList} sourceBuffers
 * @param {Function} listener
 * @param {Object} cancelSignal
 */
const onRemoveSourceBuffers = createCompatibleEventListener(["removesourcebuffer"]);

/**
 * @param {MediaKeySession} mediaKeySession
 */
const onKeyMessage = createCompatibleEventListener(["keymessage", "message"]);

/**
 * @param {MediaKeySession} mediaKeySession
 */
const onKeyAdded = createCompatibleEventListener(["keyadded", "ready"]);

/**
 * @param {MediaKeySession} mediaKeySession
 */
const onKeyError = createCompatibleEventListener(["keyerror", "error"]);

/**
 * @param {MediaKeySession} mediaKeySession
 */
const onKeyStatusesChange = createCompatibleEventListener(["keystatuseschange"]);

/**
 * @param {HTMLMediaElement} mediaElement
 */
const onSeeking = createCompatibleEventListener(["seeking"]);

/**
 * @param {HTMLMediaElement} mediaElement
 */
const onSeeked = createCompatibleEventListener(["seeked"]);

/**
 * @param {HTMLMediaElement} mediaElement
 */
const onEnded = createCompatibleEventListener(["ended"]);

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
function addEventListener(
  elt: IEventEmitterLike | IEventTarget<Record<string, Event>>,
  evt: string,
  listener: (x?: unknown) => void,
  stopListening: CancellationSignal,
): void {
  elt.addEventListener(evt, listener);
  stopListening.register(() => {
    elt.removeEventListener(evt, listener);
  });
}

export {
  addEventListener,
  createCompatibleEventListener,
  getPictureOnPictureStateRef,
  getVideoVisibilityRef,
  getElementResolutionRef,
  getScreenResolutionRef,
  onEnded,
  onKeyAdded,
  onKeyError,
  onKeyMessage,
  onKeyStatusesChange,
  onLoadedMetadata,
  onRemoveSourceBuffers,
  onSeeked,
  onSeeking,
  onSourceClose,
  onSourceEnded,
  onSourceOpen,
  onTimeUpdate,
  onSourceBufferUpdate,
  onTextTrackAdded,
  onTextTrackRemoved,
};
