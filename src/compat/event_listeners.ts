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
  combineLatest as observableCombineLatest,
  defer as observableDefer,
  fromEvent as observableFromEvent,
  interval as observableInterval,
  merge as observableMerge,
  NEVER,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  mergeMap,
  startWith,
  switchMap,
  take,
} from "rxjs/operators";
import config from "../config";
import log from "../log";
import {
  fromEvent,
  IEventEmitter,
} from "../utils/event_emitter";
import {
  HTMLElement_,
  ICompatDocument,
  ICompatPictureInPictureWindow,
  READY_STATES,
} from "./browser_compatibility_types";
import safelyRequestPIP from "./safely_request_pip";

const BROWSER_PREFIXES = ["", "webkit", "moz", "ms"];

const INACTIVITY_DELAY = config.INACTIVITY_DELAY;
const pixelRatio = window.devicePixelRatio || 1;

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
    return typeof (clone as any)[eventName] === "function";
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
    parent.concat((prefixes || BROWSER_PREFIXES)
          .map((p) => p + name)), []);
}

export interface IEventEmitterLike {
  addEventListener : (eventName: string, handler: () => void) => void;
  removeEventListener: (eventName: string, handler: () => void) => void;
}

export type IEventTargetLike = HTMLElement |
                               IEventEmitterLike |
                               IEventEmitter<any>;

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
    if (element instanceof HTMLElement_) {
      if (typeof mem === "undefined") {
        mem = findSupportedEvent(element, prefixedEvents);
      }

      if (mem) {
        return observableFromEvent(element, mem) as Observable<T>;
      } else {
        if (__DEV__) {
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
                             observableFromEvent(element, eventName))
    );
  };
}

/**
 * Returns an observable:
 *   - emitting true when the document is visible
 *   - emitting false when the document is hidden
 * @returns {Observable}
 */
function visibilityChange() : Observable<boolean> {
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

  const hidden = prefix ? prefix + "Hidden" :
                          "hidden";
  const visibilityChangeEvent = prefix ? prefix + "visibilitychange" :
                                         "visibilitychange";
  return observableDefer(() => {
    const isHidden = document[hidden as "hidden"];
    return observableFromEvent(document, visibilityChangeEvent)
      .pipe(
        map(() => !(document[hidden as "hidden"])),
        startWith(!isHidden)
      );
  });
}

/**
 * @returns {Observable}
 */
function videoSizeChange() : Observable<unknown> {
  return observableFromEvent(window, "resize");
}

// Emit `true` when visible
const isVisible$ = visibilityChange()
  .pipe(filter((x) => x));

// Emit `false` if the page is hidden for `INACTIVITY_DELAY` seconds
const isInactive$ = visibilityChange()
  .pipe(
    debounceTime(INACTIVITY_DELAY),
    filter((x) => !x)
  );

/**
 * Emit `true` if the page is considered active.
 * `false` when considered inactive.
 * Emit the original value on subscription.
 * @returns {Observable}
 */
function isActive() : Observable<boolean> {
  return observableMerge(isVisible$, isInactive$);
}

/**
 * Send, through an observable :
 * - The Picture-in-Picture window if activated
 * - A null object if not
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
function getPictureInPictureWindow$(
  mediaElement: HTMLMediaElement
) : Observable<null|ICompatPictureInPictureWindow> {
  /**
   * Try to get Picture-in-Picture window if it is activated on RxPlayer media element,
   * by trying to request again Picture-in-Picture.
   */
  const initialPIPWindow: Observable<null|ICompatPictureInPictureWindow> = (() => {
    if ((document as any).pictureInPictureElement == null ||
        (document as any).pictureInPictureElement !== mediaElement)
    {
      return observableOf(null);
    }

    if (mediaElement.readyState > READY_STATES.HAVE_NOTHING) {
      return safelyRequestPIP(mediaElement);
    }

    return compatibleListener(["loadedmetadata"])(mediaElement)
      .pipe(
        take(1),
        mergeMap(() => {
          if ((document as any).pictureInPictureElement == null ||
              (document as any).pictureInPictureElement !== mediaElement) {
            return observableOf(null);
          }
          return safelyRequestPIP(mediaElement);
        }),
        startWith(null)
      );
  })();

  return initialPIPWindow.pipe(
    mergeMap((pipWindow) => {
      return observableMerge(
        observableFromEvent(mediaElement, "enterpictureinpicture").pipe(
          map((evt: any) => evt.pictureInPictureWindow)
        ),
        observableFromEvent(mediaElement, "leavepictureinpicture").pipe(mapTo(null))
      ).pipe(startWith(pipWindow));
    })
  );
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

/**
 * Returns `true` when video is considered as visible (the page is visible and/or
 * the Picture-In-Picture is activated). Returns `false` otherwise.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
function isVideoVisible(
  mediaElement: HTMLMediaElement
) : Observable<boolean> {
  const isPIPActiveAtInit = (document as any).pictureInPictureElement != null &&
    (document as any).pictureInPictureElement === mediaElement;

  const isPIPActive$ = observableMerge(
    observableFromEvent(mediaElement, "enterpictureinpicture")
      .pipe(mapTo(true)),
    observableFromEvent(mediaElement, "leavepictureinpicture")
      .pipe(mapTo(false))
  ).pipe(startWith(isPIPActiveAtInit));

  return observableCombineLatest([visibilityChange(), isPIPActive$]).pipe(
    mergeMap(([ isVisible, isPIPActive ]) => {
      const videoVisible = isPIPActive || isVisible;
      return observableOf(videoVisible).pipe(
        debounceTime((!videoVisible) ? INACTIVITY_DELAY : 0)
      );
    }),
    distinctUntilChanged()
  );
}

/**
 * Get video width from HTML video element, or video estimated dimensions
 * when Picture-in-Picture is activated.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
function videoWidth$(mediaElement : HTMLMediaElement) : Observable<number> {
  return observableCombineLatest([
    getPictureInPictureWindow$(mediaElement),
    observableInterval(20000).pipe(startWith(null)),
    videoSizeChange().pipe(debounceTime(500), startWith(null)),
  ]).pipe(
    switchMap(([ pipWindow ]) => {
      if (pipWindow != null) {
        const firstWidth = getVideoWidthFromPIPWindow(mediaElement, pipWindow);
        return fromEvent(pipWindow, "resize").pipe(
          startWith(firstWidth * pixelRatio),
          map(() => getVideoWidthFromPIPWindow(mediaElement, pipWindow) * pixelRatio)
        );
      }
      return observableOf(mediaElement.clientWidth * pixelRatio);
    }),
    distinctUntilChanged()
  );
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
 * @param {HTMLElement} element
 * @returns {Observable}
 */
const onFullscreenChange$ = compatibleListener(
  ["fullscreenchange", "FullscreenChange"],

  // On IE11, fullscreen change events is called MSFullscreenChange
  BROWSER_PREFIXES.concat("MS")
);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onPlayPause$ = (mediaElement : HTMLMediaElement) : Observable<Event> =>
  observableMerge(compatibleListener(["play"])(mediaElement),
                  compatibleListener(["pause"])(mediaElement));

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
const onEncrypted$ = compatibleListener<MediaEncryptedEvent>(["encrypted", "needkey"]);

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

export {
  isActive,
  isVideoVisible,
  videoWidth$,
  onPlayPause$,
  onTextTrackChanges$,
  onLoadedMetadata$,
  onSeeking$,
  onSeeked$,
  onEnded$,
  onTimeUpdate$,
  onFullscreenChange$,
  onSourceOpen$,
  onUpdate$,
  onRemoveSourceBuffers$,
  onEncrypted$,
  onKeyMessage$,
  onKeyAdded$,
  onKeyError$,
  onKeyStatusesChange$,
};
