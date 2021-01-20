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

/**
 * This file provides browser-agnostic event listeners under the form of
 * RxJS Observables
 */

import {
  NEVER,
  Observable,
  fromEvent as observableFromEvent,
  merge as observableMerge,
} from "rxjs";
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
    parent.concat((prefixes == null ? BROWSER_PREFIXES :
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
 * @param {Array.<string>} eventNames
 * @param {Array.<string>|undefined} prefixes
 * @returns {Observable}
 */
function compatibleListener<T extends Event>(
  eventNames : string[],
  prefixes? : string[]
) : (element : IEventTargetLike) => Observable<T> {
  let mem : string|undefined;
  const prefixedEvents = eventPrefixed(eventNames, prefixes);
  return (element : IEventTargetLike) => {
    // if the element is a HTMLElement we can detect
    // the supported event, and memoize it in `mem`
    if (element instanceof HTMLElement) {
      if (typeof mem === "undefined") {
        mem = findSupportedEvent(element, prefixedEvents);
      }

      if (isNonEmptyString(mem)) {
        return observableFromEvent(element, mem) as Observable<T>;
      } else {
        if (__ENVIRONMENT__.CURRENT_ENV === __ENVIRONMENT__.DEV as number) {
          log.warn(`compat: element ${element.tagName}` +
                   " does not support any of these events: " +
                   prefixedEvents.join(", "));
        }
        return NEVER;
      }
    }

    // otherwise, we need to listen to all the events
    // and merge them into one observable sequence
    return observableMerge(...prefixedEvents.map(eventName =>
      observableFromEvent(element, eventName)));
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
  const ref = createSharedReference(!isHidden);

  addEventListener(document, visibilityChangeEvent, () => {
    const isVisible = !(document[hidden as "hidden"]);
    ref.setValueIfChanged(isVisible);
  }, stopListening);

  stopListening.register(() => {
    ref.finish();
  });

  return ref;
}

/**
 * Returns a reference:
 *   - Set to `true` when the current page is considered visible and active.
 *   - Set to `false` otherwise.
 * @param {Object} stopListening - `CancellationSignal` allowing to free the
 * resources allocated to update this value.
 * @returns {Object}
 */
function getPageActivityRef(
  stopListening : CancellationSignal
) : IReadOnlySharedReference<boolean> {
  const isDocVisibleRef = getDocumentVisibilityRef(stopListening);
  let currentTimeout : number | undefined;
  const ref = createSharedReference(true);
  stopListening.register(() => {
    clearTimeout(currentTimeout);
    currentTimeout = undefined;
    ref.finish();
  });

  isDocVisibleRef.onUpdate(function onDocVisibilityChange(isVisible : boolean) : void {
    clearTimeout(currentTimeout); // clear potential previous timeout
    currentTimeout = undefined;
    if (!isVisible) {
      const { INACTIVITY_DELAY } = config.getCurrent();
      currentTimeout = window.setTimeout(() => {
        ref.setValueIfChanged(false);
      }, INACTIVITY_DELAY);
    }
    ref.setValueIfChanged(true);
  }, { clearSignal: stopListening, emitCurrentValue: true });

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
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
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
    });
    addEventListener(mediaElement, "webkitpresentationmodechanged", () => {
      const isEnabled = mediaElement.webkitPresentationMode === "picture-in-picture";
      ref.setValue({ isEnabled, pipWindow: null });
    }, stopListening);
    stopListening.register(() => {
      ref.finish();
    });
    return ref;
  }

  const isPIPEnabled = (
    (document as ICompatDocument).pictureInPictureElement === mediaElement
  );
  const ref = createSharedReference<IPictureInPictureEvent>({ isEnabled: isPIPEnabled,
                                                              pipWindow: null });
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
  stopListening.register(() => {
    ref.finish();
  });
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
 * @returns {Observable}
 */
function getVideoVisibilityRef(
  pipStatus : IReadOnlySharedReference<IPictureInPictureEvent>,
  stopListening : CancellationSignal
) : IReadOnlySharedReference<boolean> {
  const isDocVisibleRef = getDocumentVisibilityRef(stopListening);
  let currentTimeout : number | undefined;
  const ref = createSharedReference(true);
  stopListening.register(() => {
    clearTimeout(currentTimeout);
    currentTimeout = undefined;
    ref.finish();
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
  const ref = createSharedReference<number>(mediaElement.clientWidth * pixelRatio);
  let clearPreviousEventListener = noop;
  pipStatusRef.onUpdate(checkVideoWidth, { clearSignal: stopListening });
  addEventListener(window, "resize", checkVideoWidth, stopListening);
  const interval = window.setInterval(checkVideoWidth, 20000);

  checkVideoWidth();

  stopListening.register(function stopUpdatingVideoWidthRef() {
    clearPreviousEventListener();
    clearInterval(interval);
    ref.finish();
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
 * @returns {Observable}
 */
const onLoadedMetadata$ = compatibleListener(["loadedmetadata"]);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onSeeking$ = compatibleListener(["seeking"]);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onSeeked$ = compatibleListener(["seeked"]);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onEnded$ = compatibleListener(["ended"]);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onTimeUpdate$ = compatibleListener(["timeupdate"]);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onTextTrackChanges$ =
  (textTrackList : TextTrackList) : Observable<TrackEvent> =>
    observableMerge(compatibleListener<TrackEvent>(["addtrack"])(textTrackList),
                    compatibleListener<TrackEvent>(["removetrack"])(textTrackList));

/**
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
const onSourceOpen$ = compatibleListener(["sourceopen", "webkitsourceopen"]);

/**
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
const onSourceClose$ = compatibleListener(["sourceclose", "webkitsourceclose"]);

/**
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
const onSourceEnded$ = compatibleListener(["sourceended", "webkitsourceended"]);

/**
 * @param {SourceBuffer} sourceBuffer
 * @returns {Observable}
 */
const onUpdate$ = compatibleListener(["update"]);

/**
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
const onRemoveSourceBuffers$ = compatibleListener(["onremovesourcebuffer"]);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onEncrypted$ = compatibleListener<MediaEncryptedEvent>(
  shouldFavourCustomSafariEME() ? ["needkey"] :
                                  ["encrypted", "needkey"]);

/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
const onKeyMessage$ = compatibleListener<MediaKeyMessageEvent>(["keymessage", "message"]);

/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
const onKeyAdded$ = compatibleListener(["keyadded", "ready"]);

/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
const onKeyError$ = compatibleListener(["keyerror", "error"]);

/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
const onKeyStatusesChange$ = compatibleListener(["keystatuseschange"]);

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
  getPageActivityRef,
  getPictureOnPictureStateRef,
  getVideoVisibilityRef,
  getVideoWidthRef,
  onEncrypted$,
  onEnded$,
  onKeyAdded$,
  onKeyError$,
  onKeyMessage$,
  onKeyStatusesChange$,
  onLoadedMetadata$,
  onRemoveSourceBuffers$,
  onSeeked$,
  onSeeking$,
  onSourceClose$,
  onSourceEnded$,
  onSourceOpen$,
  onTextTrackChanges$,
  onTimeUpdate$,
  onUpdate$,
};
