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
  fromEvent as observableFromEvent,
  interval as observableInterval,
  merge as observableMerge,
  never as observableNever,
  Observable,
} from "rxjs";
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  startWith,
} from "rxjs/operators";
import config from "../config";
import EventEmitter from "../utils/eventemitter";
import log from "../utils/log";

import {
  BROWSER_PREFIXES,
  HTMLElement_,
} from "./constants";

const INACTIVITY_DELAY = config.INACTIVITY_DELAY;
const pixelRatio = window.devicePixelRatio || 1;

/**
 * Find the first supported event from the list given.
 * @param {Element} element
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
 * @param {Element} element
 * @param {Array.<string>} eventNames
 * @returns {string}
 */
function findSupportedEvent(
  element : HTMLElement,
  eventNames : string[]
) : string|undefined {
  return eventNames
    .filter((name) => isEventSupported(element, name))[0];
}

function eventPrefixed(eventNames : string[], prefixes? : string[]) : string[] {
  return eventNames.reduce((parent : string[], name : string) =>
    parent
      .concat((prefixes || BROWSER_PREFIXES)
      .map((p) => p + name)), []);
}

export interface IEventEmitterLike {
  addEventListener : (eventName: string, handler: () => void) => void;
  removeEventListener: (eventName: string, handler: () => void) => void;
}

// XXX TODO
export type IEventTargetLike =
  HTMLElement |
  IEventEmitterLike |
  EventEmitter<string, any>;

/**
 * @param {Array.<string>} eventNames
 * @param {Array.<string>} prefixes
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
          /* tslint:disable:max-line-length */
          log.warn(
            `compat: element <${element.tagName}> does not support any of these events: ${prefixedEvents.join(", ")}`
            /* tslint:enable:max-line-length */
          );
        }
        return observableNever();
      }
    }

    // otherwise, we need to listen to all the events
    // and merge them into one observable sequence
    return observableMerge(
      ...prefixedEvents
        .map(eventName => observableFromEvent(element, eventName))
    );
  };
}

/**
 * Returns an observable:
 *   - emitting true when the visibility of document changes to hidden
 *   - emitting false when the visibility of document changes to visible
 * @returns {Observable}
 */
function visibilityChange() : Observable<boolean> {
  let prefix;
  if (document.hidden != null) {
    prefix = "";
  } else if (document.mozHidden != null) {
    prefix = "moz";
  } else if (document.msHidden != null) {
    prefix = "ms";
  } else if (document.webkitHidden != null) {
    prefix = "webkit";
  }

  const hidden = prefix ? prefix + "Hidden" : "hidden";
  const visibilityChangeEvent = prefix + "visibilitychange";

  return observableFromEvent(document, visibilityChangeEvent)
    .pipe(map(() => document[hidden as "hidden"]));
}

function videoSizeChange() : Observable<null> {
  return observableFromEvent(window, "resize")
    .pipe(mapTo(null));
}

const isVisible = visibilityChange()
  .pipe(filter((x) => !x)); // emit false when visible

// Emit true if the visibility changed to hidden since 60s
const isHidden = visibilityChange()
  .pipe(
    debounceTime(INACTIVITY_DELAY),
    filter((x) => x)
  );

const isInBackground$ = () => observableMerge(isVisible, isHidden)
  .pipe(startWith(false));

function videoWidth$(videoElement : HTMLMediaElement) : Observable<number> {
  return observableMerge(
    observableInterval(20000).pipe(mapTo(null)),
    videoSizeChange().pipe(debounceTime(500))
  )
    .pipe(
      startWith(null), // emit on subscription
      map(() => videoElement.clientWidth * pixelRatio),
      distinctUntilChanged()
    );
}

const onLoadedMetadata$ = compatibleListener(["loadedmetadata"]);
const onSeeking$ = compatibleListener(["seeking"]);
const onSeeked$ = compatibleListener(["seeked"]);
const onEnded$ = compatibleListener(["ended"]);
const onTimeUpdate$ = compatibleListener(["timeupdate"]);
const onFullscreenChange$ = compatibleListener(
  ["fullscreenchange", "FullscreenChange"],

  // On IE11, fullscreen change events is called MSFullscreenChange
  BROWSER_PREFIXES.concat("MS")
);

const onPlayPause$ = (videoElement : HTMLMediaElement) : Observable<Event> =>
  observableMerge(
    compatibleListener(["play"])(videoElement),
    compatibleListener(["pause"])(videoElement)
  );

const onTextTrackChanges$ =
  (textTrackList : TextTrackList) : Observable<TrackEvent> =>
    observableMerge(
      compatibleListener<TrackEvent>(["addtrack"])(textTrackList),
      compatibleListener<TrackEvent>(["removetrack"])(textTrackList)
    );

const onSourceOpen$ = compatibleListener(["sourceopen", "webkitsourceopen"]);
const onUpdate$ = compatibleListener(["update"]);
const onRemoveSourceBuffers$ = compatibleListener(["onremovesourcebuffer"]);

const onEncrypted$ = compatibleListener<MediaEncryptedEvent>(["encrypted", "needkey"]);
const onKeyMessage$ = compatibleListener<MediaKeyMessageEvent>(["keymessage", "message"]);
const onKeyAdded$ = compatibleListener(["keyadded", "ready"]);
const onKeyError$ = compatibleListener(["keyerror", "error"]);
const onKeyStatusesChange$ = compatibleListener(["keystatuseschange"]);

export {
  isInBackground$,
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
