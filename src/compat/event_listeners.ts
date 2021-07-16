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
import { IEventEmitter } from "../utils/event_emitter";
import isNonEmptyString from "../utils/is_non_empty_string";
import isNullOrUndefined from "../utils/is_null_or_undefined";
import noop from "../utils/noop";
import createSharedReference, {
  IReadOnlySharedReference,
} from "../utils/reference";
import { CancellationSignal } from "../utils/task_canceller";
import {
  ICompatDocument,
  ICompatHTMLMediaElement,
  ICompatPictureInPictureWindow,
} from "./browser_compatibility_types";
import isNode from "./is_node";
import shouldFavourCustomSafariEME from "./should_favour_custom_safari_EME";

const BROWSER_PREFIXES = ["", "webkit", "moz", "ms"];

const pixelRatio = isNode ||
                   window.devicePixelRatio == null ||
                   window.devicePixelRatio === 0 ? 1 :
                                                   window.devicePixelRatio;

/**
 * Find the first supported event from the list given.
 * @param {HTMLElement} element
 * @param {string} eventNameSuffix
 * @returns {Boolean}
 */
function isEventSupported(
  element : HTMLElement,
  eventNameSuffix : string
) : boolean {
  const clone = document.createElement(element.tagName);
  const eventName = "on" + eventNameSuffix;
  if (eventName in clone) {
    return true;
  } else {
    clone.setAttribute(eventName, "return;");
    return typeof (
      clone as HTMLElement & Partial<Record<string, unknown>>
    )[eventName] === "function";
  }
}

/**
 * Find the first supported event from the list given.
 * @param {HTMLElement} element
 * @param {Array.<string>} eventNames
 * @returns {string|undefined}
 */
function findSupportedEvent(
  element : HTMLElement,
  eventNames : string[]
) : string|undefined {
  return eventNames
    .filter((name) => isEventSupported(element, name))[0];
}

/**
 * @param {Array.<string>} eventNames
 * @param {Array.<string>|undefined} prefixes
 * @returns {Array.<string>}
 */
function eventPrefixed(eventNames : string[], prefixes? : string[]) : string[] {
  return eventNames.reduce((parent : string[], name : string) =>
    parent.concat((prefixes === undefined ? BROWSER_PREFIXES :
                                            prefixes)
      .map((p) => p + name)), []);
}

export interface IEventEmitterLike {
  addEventListener : (eventName: string, handler: () => void) => void;
  removeEventListener: (eventName: string, handler: () => void) => void;
}

export type IEventTargetLike = HTMLElement |
                               IEventEmitterLike |
                               IEventEmitter<unknown>;

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
  eventNames : string[],
  prefixes? : string[]
) :
  (
    element : IEventTargetLike,
    listener : (event? : unknown) => void,
    cancelSignal: CancellationSignal
  ) => void
{
  let mem : string|undefined;
  const prefixedEvents = eventPrefixed(eventNames, prefixes);

  return (
    element : IEventTargetLike,
    listener: (event? : unknown) => void,
    cancelSignal: CancellationSignal
  ) => {
    if (cancelSignal.isCancelled) {
      return;
    }

    // if the element is a HTMLElement we can detect
    // the supported event, and memoize it in `mem`
    if (element instanceof HTMLElement) {
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
        if (__ENVIRONMENT__.CURRENT_ENV === __ENVIRONMENT__.DEV as number) {
          log.warn(`compat: element ${element.tagName}` +
                   " does not support any of these events: " +
                   prefixedEvents.join(", "));
        }
        return ;
      }
    }

    prefixedEvents.forEach(eventName => {
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
  stopListening : CancellationSignal
) : IReadOnlySharedReference<boolean> {
  let prefix : string|undefined;

  const doc = document as ICompatDocument;
  if (doc.hidden != null) {
    prefix = "";
  } else if (doc.mozHidden != null) {
    prefix = "moz";
  } else if (doc.msHidden != null) {
    prefix = "ms";
  } else if (doc.webkitHidden != null) {
    prefix = "webkit";
  }

  const hidden = isNonEmptyString(prefix) ? prefix + "Hidden" :
                                            "hidden";
  const visibilityChangeEvent = isNonEmptyString(prefix) ? prefix + "visibilitychange" :
                                                           "visibilitychange";

  const isHidden = document[hidden as "hidden"];
  const ref = createSharedReference(!isHidden, stopListening);

  addEventListener(document, visibilityChangeEvent, () => {
    const isVisible = !(document[hidden as "hidden"]);
    ref.setValueIfChanged(isVisible);
  }, stopListening);

  return ref;
}

/**
 * Get video width from Picture-in-Picture window
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} pipWindow
 * @returns {number}
 */
function getVideoWidthFromPIPWindow(
  mediaElement: HTMLMediaElement,
  pipWindow: ICompatPictureInPictureWindow
): number {
  const { width, height } = pipWindow;
  const videoRatio = mediaElement.clientHeight / mediaElement.clientWidth;
  const calcWidth = height / videoRatio;
  return Math.min(width, calcWidth);
}

export interface IPictureInPictureEvent {
  isEnabled : boolean;
  pipWindow : ICompatPictureInPictureWindow | null;
}

/**
 * Emit when video enters and leaves Picture-In-Picture mode.
 * @param {HTMLMediaElement} elt
 * @param {Object} stopListening
 * @returns {Object}
 */
function getPictureOnPictureStateRef(
  elt: HTMLMediaElement,
  stopListening: CancellationSignal
): IReadOnlySharedReference<IPictureInPictureEvent> {
  const mediaElement = elt as ICompatHTMLMediaElement;
  if (mediaElement.webkitSupportsPresentationMode === true &&
      typeof mediaElement.webkitSetPresentationMode === "function")
  {
    const isWebKitPIPEnabled =
      mediaElement.webkitPresentationMode === "picture-in-picture";
    const ref = createSharedReference<IPictureInPictureEvent>({
      isEnabled: isWebKitPIPEnabled,
      pipWindow: null,
    }, stopListening);
    addEventListener(mediaElement, "webkitpresentationmodechanged", () => {
      const isEnabled = mediaElement.webkitPresentationMode === "picture-in-picture";
      ref.setValue({ isEnabled, pipWindow: null });
    }, stopListening);
    return ref;
  }

  const isPIPEnabled = (
    (document as ICompatDocument).pictureInPictureElement === mediaElement
  );
  const ref = createSharedReference<IPictureInPictureEvent>({ isEnabled: isPIPEnabled,
                                                              pipWindow: null },
                                                            stopListening);
  addEventListener(mediaElement, "enterpictureinpicture", (evt) => {
    ref.setValue({
      isEnabled: true,
      pipWindow: (evt as Event & {
        pictureInPictureWindow? : ICompatPictureInPictureWindow;
      }).pictureInPictureWindow ?? null,
    });
  }, stopListening);
  addEventListener(mediaElement, "leavepictureinpicture", () => {
    ref.setValue({ isEnabled: false, pipWindow: null });
  }, stopListening);
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
  pipStatus : IReadOnlySharedReference<IPictureInPictureEvent>,
  stopListening : CancellationSignal
) : IReadOnlySharedReference<boolean> {
  const isDocVisibleRef = getDocumentVisibilityRef(stopListening);
  let currentTimeout : number | undefined;
  const ref = createSharedReference(true, stopListening);
  stopListening.register(() => {
    clearTimeout(currentTimeout);
    currentTimeout = undefined;
  });

  isDocVisibleRef.onUpdate(checkCurrentVisibility,
                           { clearSignal: stopListening });
  pipStatus.onUpdate(checkCurrentVisibility,
                     { clearSignal: stopListening });
  checkCurrentVisibility();
  return ref;

  function checkCurrentVisibility() : void {
    clearTimeout(currentTimeout);
    currentTimeout = undefined;
    if (pipStatus.getValue().isEnabled || isDocVisibleRef.getValue()) {
      ref.setValueIfChanged(true);
    } else {
      const { INACTIVITY_DELAY } = config.getCurrent();
      currentTimeout = window.setTimeout(() => {
        ref.setValueIfChanged(false);
      }, INACTIVITY_DELAY);
    }
  }
}

/**
 * Get video width from HTML video element, or video estimated dimensions
 * when Picture-in-Picture is activated.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} pipStatusRef
 * @param {Object} stopListening
 * @returns {Object}
 */
function getVideoWidthRef(
  mediaElement : HTMLMediaElement,
  pipStatusRef : IReadOnlySharedReference<IPictureInPictureEvent>,
  stopListening : CancellationSignal
) : IReadOnlySharedReference<number> {
  const ref = createSharedReference<number>(mediaElement.clientWidth * pixelRatio,
                                            stopListening);
  let clearPreviousEventListener = noop;
  pipStatusRef.onUpdate(checkVideoWidth, { clearSignal: stopListening });
  addEventListener(window, "resize", checkVideoWidth, stopListening);
  const interval = window.setInterval(checkVideoWidth, 20000);

  checkVideoWidth();

  stopListening.register(function stopUpdatingVideoWidthRef() {
    clearPreviousEventListener();
    clearInterval(interval);
  });
  return ref;

  function checkVideoWidth() {
    clearPreviousEventListener();
    const pipStatus = pipStatusRef.getValue();
    if (!pipStatus.isEnabled) {
      ref.setValueIfChanged(mediaElement.clientWidth * pixelRatio);
    } else if (!isNullOrUndefined(pipStatus.pipWindow)) {
      const { pipWindow } = pipStatus;
      const firstWidth = getVideoWidthFromPIPWindow(mediaElement, pipWindow);
      const onPipResize = () => {
        ref.setValueIfChanged(
          getVideoWidthFromPIPWindow(mediaElement, pipWindow) * pixelRatio
        );
      };
      pipWindow.addEventListener("resize", onPipResize);
      clearPreviousEventListener = () => {
        pipWindow.removeEventListener("resize", onPipResize);
        clearPreviousEventListener = noop;
      };
      ref.setValueIfChanged(firstWidth * pixelRatio);
    } else {
      ref.setValueIfChanged(Infinity);
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
 * @param {HTMLMediaElement} mediaElement
 */
const onEncrypted = createCompatibleEventListener(
  shouldFavourCustomSafariEME() ? ["needkey"] :
                                  ["encrypted", "needkey"]);

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
  elt : IEventEmitterLike,
  evt : string,
  listener : (x? : unknown) => void,
  stopListening : CancellationSignal
) : void {
  elt.addEventListener(evt, listener);
  stopListening.register(() => {
    elt.removeEventListener(evt, listener);
  });
}

export {
  addEventListener,
  getPictureOnPictureStateRef,
  getVideoVisibilityRef,
  getVideoWidthRef,
  onEncrypted,
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
